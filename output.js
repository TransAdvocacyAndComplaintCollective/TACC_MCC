// Load the environment variables from the process
const envVars = process.env;

// Print each environment variable
console.log("Environment Variables:");
Object.keys(envVars).forEach((key) => {
    console.log(`${key}: ${envVars[key]}`);
});
