import * as fs from 'fs';
import { promisify } from 'util';
import * as path from 'path';

export async function clearCache(): Promise<void> {
  return new Promise((resolve) => {
    const cacheDir = path.join(__dirname, '../.cache');
    fs.readdir(cacheDir, (err, files) => {
      if (err) {
        console.error(err);
        resolve();
        return;
      }

      const unlinkPromise = promisify(fs.unlink);

      const promises = [];
      files.forEach((file) => {
        const filePath = path.join(cacheDir, file);
        promises.push(unlinkPromise(filePath));
      });

      Promise.all(promises).then(() => resolve());
    });
  });
}
