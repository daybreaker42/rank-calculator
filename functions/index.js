const {onDocumentWritten} = require("firebase-functions/v2/firestore");
const {setGlobalOptions} = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

// Set global options to limit instances (cost control)
setGlobalOptions({maxInstances: 10, region: "asia-northeast3"});

/**
 * Triggered when a vote is created, updated, or deleted.
 * Updates the aggregated statistics for the subject.
 */
exports.updateStats = onDocumentWritten("votes/{voteId}", async (event) => {
  const beforeData = event.data.before ? event.data.before.data() : null;
  const afterData = event.data.after ? event.data.after.data() : null;

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

    if (!beforeData && afterData) {
      // CREATE
      const score = afterData.score;
      const bucket = Math.floor(score / 5) * 5;
      stats.count += 1;
      stats.sum += score;
      stats.histogram[bucket] = (stats.histogram[bucket] || 0) + 1;
      if (stats.min === null || afterData.minScore < stats.min) {
        stats.min = afterData.minScore;
      }
      if (stats.max === null || afterData.maxScore > stats.max) {
        stats.max = afterData.maxScore;
      }
      // Update subject popularity
      transaction.update(db.doc(`subjects/${subjectId}`), {
        voteCount: admin.firestore.FieldValue.increment(1),
      });
    } else if (beforeData && afterData) {
      // UPDATE
      const oldScore = beforeData.score;
      const newScore = afterData.score;
      if (oldScore !== newScore) {
        const oldB = Math.floor(oldScore / 5) * 5;
        const newB = Math.floor(newScore / 5) * 5;
        stats.sum = stats.sum - oldScore + newScore;
        if (oldB !== newB) {
          stats.histogram[oldB] = Math.max(0, (stats.histogram[oldB] || 1) - 1);
          stats.histogram[newB] = (stats.histogram[newB] || 0) + 1;
        }
      }
      if (afterData.minScore < stats.min) stats.min = afterData.minScore;
      if (afterData.maxScore > stats.max) stats.max = afterData.maxScore;
    } else if (beforeData && !afterData) {
      // DELETE
      const score = beforeData.score;
      const bucket = Math.floor(score / 5) * 5;
      stats.count = Math.max(0, stats.count - 1);
      stats.sum = Math.max(0, stats.sum - score);
      stats.histogram[bucket] = Math.max(0, (stats.histogram[bucket] || 1) - 1);
      // Update subject popularity
      transaction.update(db.doc(`subjects/${subjectId}`), {
        voteCount: admin.firestore.FieldValue.increment(-1),
      });
    }

    transaction.set(statsRef, stats, {merge: true});
  });
});
