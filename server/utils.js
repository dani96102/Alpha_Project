// server/utils.js
/**
 * Gets an environment variable, throwing an error if it's not set.
 * @param {string} name The name of the environment variable.
 * @returns {string} The value of the environment variable.
 * @throws {Error} If the environment variable is not set.
 */
function getEnvOrThrow(name) {
    const value = process.env[name];
    if (!value) {
      throw new Error(`FATAL ERROR: Environment variable "${name}" is not set.`);
    }
    return value;
  }
  
  module.exports = { getEnvOrThrow };