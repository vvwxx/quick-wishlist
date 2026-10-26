"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

// Hash of the kit files, used to detect a copy edited by hand inside a plugin.
// Line endings are normalized so a checkout on Windows gives the same hash.
function kitHash(dir, files) {
  const h = crypto.createHash("sha256");
  for (const f of files) {
    h.update(f + "\0");
    h.update(fs.readFileSync(path.join(dir, f), "utf8").replace(/\r\n/g, "\n"));
    h.update("\0");
  }
  return h.digest("hex");
}

module.exports = { kitHash };
