const identity = (a) => `${a.id}@${a.version}@${a.sha256}`;
const withdrawnKeys = (handoff) =>
  new Set((handoff?.affectedCurrentReviews ?? []).map(identity));
function curate(a, withdrawn) {
  return withdrawn.has(identity(a))
    ? {
        ...a,
        stage: "needs-rework",
        qualityStatus: "needs-rework",
        visualReview: {
          ...a.visualReview,
          status: "withdrawn",
          reason: "Part-contact review requires revision.",
        },
      }
    : a;
}
module.exports = { identity, withdrawnKeys, curate };
