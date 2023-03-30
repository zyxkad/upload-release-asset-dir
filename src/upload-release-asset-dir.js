const core = require('@actions/core');
const { GitHub } = require('@actions/github');
const fs = require('fs');
const path = require('path');
const mime = require('mime');

async function run() {
  try {
    // Get authenticated GitHub client (Ocktokit): https://github.com/actions/toolkit/tree/master/packages/github#usage
    const github = new GitHub(process.env.GITHUB_TOKEN);

    // Get the inputs from the workflow file: https://github.com/actions/toolkit/tree/master/packages/core#inputsoutputs
    const uploadUrl = core.getInput('upload_url', { required: true });
    const assetDir = core.getInput('asset_dir', { required: true });

    const promises = (await fs.promises.readdir(assetDir))
      .filter(n => !n.startsWith('.'))
      .map(async assetName => {
        const assetPath = path.join(assetDir, assetName);
        const assetContentType = mime.getType(assetName) || 'application/x-binary';

        // Setup headers for API call, see Octokit Documentation: https://octokit.github.io/rest.js/#octokit-routes-repos-upload-release-asset for more information
        const headers = {
          'content-type': assetContentType,
          'content-length': fs.statSync(assetPath).size
        };

        // Upload a release asset
        // API Documentation: https://developer.github.com/v3/repos/releases/#upload-a-release-asset
        // Octokit Documentation: https://octokit.github.io/rest.js/#octokit-routes-repos-upload-release-asset
        const uploadAssetResponse = await github.repos.uploadReleaseAsset({
          url: uploadUrl,
          headers,
          name: assetName,
          file: fs.readFileSync(assetPath)
        });

        // Get the browser_download_url for the uploaded release asset from the response
        const {
          data: { browser_download_url: browserDownloadUrl }
        } = uploadAssetResponse;
        return browserDownloadUrl;
      });

    const browserDownloadUrls = await Promise.all(promises);
    // Set the output variable for use by other actions: https://github.com/actions/toolkit/tree/master/packages/core#inputsoutputs
    core.setOutput('browser_download_urls', browserDownloadUrls);
  } catch (error) {
    core.setFailed(error.message);
  }
}

module.exports = run;
