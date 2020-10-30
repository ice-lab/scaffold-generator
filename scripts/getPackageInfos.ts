import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import axios from 'axios';

const TIMEOUT = 8000; // ms

export interface IPackageInfo {
  name: string;
  directory: string;
  localVersion: string;
  shouldPublish: boolean;
}

function checkVersionExists(pkg: string, version: string): Promise<boolean> {
  return axios(
    `https://unpkg.com/${pkg}@${version}/`,
    { timeout: TIMEOUT }
  )
    .then((res) => res.status === 200)
    .catch(() => false);
}

export async function getPackageInfos(): Promise<IPackageInfo[]> {
  const packageInfos: IPackageInfo[] = [];
  const directory = __dirname;
  const packageInfoPath = join(directory, 'package.json');

  const packageInfo = JSON.parse(readFileSync(packageInfoPath, 'utf8'));
  const packageName = packageInfo.name;
  const publised = await checkVersionExists(packageName, packageInfo.version);

  packageInfos.push({
    name: packageName,
    directory,
    localVersion: packageInfo.version,
    // If localVersion not exist, publish it
    shouldPublish: !publised
  });

  console.log(`Check published: ${packageName}@${packageInfo.version} ${publised}`);

  return packageInfos;
}