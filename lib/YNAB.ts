import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';
import * as crypto from 'crypto';
import debug from 'debug';
import fetch from 'node-fetch';
import * as querystring from 'querystring';
import { delayPromise } from './promise';

const defaultOptions = {
  base: 'https://api.youneedabudget.com/v1',
  query: {},
};

interface YNABOptions {
  base: string;
  query: object;
}

export class YNAB {
  options: YNABOptions;
  token: string;
  cache: {};
  debug = debug('ynab-tools:ynab');
  delay = 0;
  delayTimeout = null;
  requests = 0;

  constructor(token: string, options = {}) {
    this.options = {
      ...defaultOptions,
      ...options,
    };

    this.token = token;
  }

  debugThrough(debugValue: any, message: string = null): any {
    const args = [];
    if (message) {
      args.push(message);
    }
    args.push(debugValue);

    this.debug(...args);
    return debugValue;
  }

  async getAccounts(budgetId) {
    return this.request(`/budgets/${budgetId}/accounts`);
  }

  async getBudgets() {
    return this.request('/budgets');
  }

  async getCategories(budgetId) {
    return this.request(`/budgets/${budgetId}/categories`);
  }

  async getCategoryAmount(budgetId, categoryId, month = 'current') {
    return this.request(`/budgets/${budgetId}/months/${month}/categories/${categoryId}`);
  }

  async getTransactions(budgetId, accountId) {
    return this.request(`/budgets/${budgetId}/accounts/${accountId}/transactions`);
  }

  async getCategoryTransactions(budgetId, categoryId, options = {}) {
    return this.request(`/budgets/${budgetId}/categories/${categoryId}/transactions`, options);
  }

  delayHalflife() {
    if (this.delayTimeout !== null) {
      clearTimeout(this.delayTimeout);
      this.delayTimeout = setTimeout(() => {
        if (this.delay > 0) {
          this.delay -= 1000;
          if (this.delay > 0) {
            this.delayHalflife();
          }
        }
      });
    }
  }

  async getFromCacheOrRequest(fullUrl) {
    this.requests += 1;
    const hash = crypto.createHash('sha1');
    hash.update(fullUrl);
    const filename = hash.digest('hex');
    const cachePath = path.join(__dirname, `../.cache/${filename}`);

    const readFilePromise = util.promisify(fs.readFile);

    this.delay = 1000 * (this.requests % 5);
    this.delayHalflife();

    return readFilePromise(cachePath, 'utf8')
      .then((data) => {
        this.requests -= 1;
        const cacheData = JSON.parse(data);
        if (typeof cacheData._timestamp === 'undefined') {
          throw new Error('Cache value does not have timestamp');
        }

        if (Date.now() - cacheData._timestamp > 60 * 60 * 1000) {
          throw new Error('Cache value is stale');
        }
        return cacheData;
      })
      .catch((err) => {
        this.debug('Could not get from cache:', err);
        return this.fetch(fullUrl, cachePath);
      });
  }

  async fetch(fullUrl, cachePath) {
    this.debug('Cache not found. Requesting %s', fullUrl);
    return delayPromise(this.delay).then(() => fetch(fullUrl, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
    })
      .then((res) => {
        if (res.status !== 200) {
          throw new Error(`Invalid status code back from YNAB request: ${res.status}`);
        }
        return res;
      })
      .then((res) => this.debugThrough(res, 'Got response from the API'))
      .then((res) => res.json())
      .then((json) => {
        const cacheData = { ...json, _timestamp: Date.now() };
        fs.writeFile(cachePath, JSON.stringify(cacheData), (err) => {
          if (err) {
            console.error(`Error writing cache file: ${cachePath}`, err);
          }
        });
        this.requests -= 1;
        return json;
      })
      .catch((fetchError) => {
        this.requests -= 1;
        console.error(`YNAB error: ${fetchError}`);
        throw fetchError;
      }));
  }

  async request(endpoint, options = {}) {
    const requestOptions = { ...this.options, ...options };
    const { base } = requestOptions;
    const search = Object.keys(requestOptions.query).length > 0 ? `?${querystring.stringify(requestOptions.query)}` : '';
    const fullUrl = `${base}${endpoint}${search}`;
    return this.getFromCacheOrRequest(fullUrl);
  }
}
