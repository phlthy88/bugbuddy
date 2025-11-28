import { fetchGithubRepo } from './src/services/github.ts';

async function testGitHubImport() {
  console.log('Testing GitHub import for google/guava...');

  try {
    const result = await fetchGithubRepo('google/guava', '', undefined, (msg) => {
      console.log('Progress:', msg);
    });

    console.log('Import successful!');
    console.log('Summary:', result.summary);
    console.log('Files imported:', result.files.length);
    console.log('Truncated:', result.truncated);

    // Check if files are parsed correctly
    console.log('\nAll imported files:');
    result.files.forEach(file => {
      console.log(`- ${file.path} (${file.language}, ${file.size} bytes)`);
    });

    // Check file tree structure
    const paths = result.files.map(f => f.path);
    const dirs = new Set(paths.map(p => p.split('/').slice(0, -1).join('/')).filter(d => d));
    console.log('\nDirectories found:', Array.from(dirs).slice(0, 10));

    // Test selecting a file
    if (result.files.length > 0) {
      const testFile = result.files[0];
      console.log(`\nSelected file: ${testFile.path}`);
      console.log('Content preview:', testFile.content.substring(0, 200) + '...');
    }

  } catch (error) {
    console.error('Import failed:', error);
  }
}

testGitHubImport();