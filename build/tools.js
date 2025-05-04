import { execSync } from "child_process";
import fs from "fs";
const REPO_DIR = "cloned_repo";
function cloneRepo(repoUrl) {
    if (fs.existsSync(REPO_DIR))
        fs.rmSync(REPO_DIR, { recursive: true, force: true });
    console.log(`🚀 Cloning ${repoUrl}...`);
    execSync(`git clone ${repoUrl} ${REPO_DIR}`, { stdio: "inherit" });
}
async function run() {
    const repoUrl = "";
    if (!repoUrl) {
        console.error("❌ Please provide a GitHub repo URL.");
        cloneRepo(repoUrl);
        console.log(`🔍 Analyzing ${REPO_DIR}...`);
        // feed the cloned repo to analyzer
    }
}
