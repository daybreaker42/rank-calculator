const {onDocumentWritten} = require("firebase-functions/v2/firestore");
const {setGlobalOptions} = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

// Set global options to limit instances (cost control)
setGlobalOptions({maxInstances: 10, region: "asia-northeast3"}); // Seoul region

/**
 * Triggered when a vote is created, updated, or deleted.
 * Updates the aggregated statistics for the subject.
 */
exports.updateStats = onDocumentWritten("votes/{voteId}", async (event) => {
  const beforeData = event.data.before ? event.data.before.data() : null;
  const afterData = event.data.after ? event.data.after.data() : null;

  // 1. Determine action type and target
  // We need subjectId and type from the document data
  const data = afterData || beforeData;
  if (!data) return null;

  const {subjectId, type} = data;
  const statsRef = db.doc(`subjects/${subjectId}/stats/${type}`);

  return db.runTransaction(async (transaction) => {
    const statsSnap = await transaction.get(statsRef);
    const stats = statsSnap.exists ? statsSnap.data() : {
      count: 0,
      sum: 0,
      min: null,
      max: null,
      histogram: {},
    };

    // 2. Adjust stats based on the change
    if (!beforeData && afterData) {
      // CREATE: Add new score
      const score = afterData.score;
      const bucket = Math.floor(score / 5) * 5;

      stats.count += 1;
      stats.sum += score;
      stats.histogram[bucket] = (stats.histogram[bucket] || 0) + 1;
      
      // Min/Max (Simple update, deletion would require full recalculation which is expensive)
      if (stats.min === null || afterData.minScore < stats.min) stats.min = afterData.minScore;
      if (stats.max === null || afterData.maxScore > stats.max) stats.max = afterData.maxScore;

    } else if (beforeData && afterData) {
      // UPDATE: Swap old score for new score
      const oldScore = beforeData.score;
      const newScore = afterData.score;
      
      if (oldScore !== newScore) {
        const oldBucket = Math.floor(oldScore / 5) * 5;
        const newBucket = Math.floor(newScore / 5) * 5;

        stats.sum = stats.sum - oldScore + newScore;
        
        if (oldBucket !== newBucket) {
          stats.histogram[oldBucket] = Math.max(0, (stats.histogram[oldBucket] || 1) - 1);
          stats.histogram[newBucket] = (stats.histogram[newBucket] || 0) + 1;
        }
      }

      // Update min/max if new values are more extreme
      if (afterData.minScore < stats.min) stats.min = afterData.minScore;
      if (afterData.maxScore > stats.max) stats.max = afterData.maxScore;

    } else if (beforeData && !afterData) {
      // DELETE: Remove score
      const score = beforeData.score;
      const bucket = Math.floor(score / 5) * 5;

      stats.count = Math.max(0, stats.count - 1);
      stats.sum = Math.max(0, stats.sum - score);
      stats.histogram[bucket] = Math.max(0, (stats.histogram[bucket] || 1) - 1);
      
      // Note: True min/max recalculation on delete is complex without storing all values.
      // For this app, we'll keep the current min/max as they are "historical" extremes.
    }

    // 3. Save updated stats
    transaction.set(statsRef, stats, {merge: true});
  });
});
