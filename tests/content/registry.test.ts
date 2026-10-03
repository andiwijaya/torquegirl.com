import { test } from 'node:test';
import assert from 'node:assert/strict';
import { allArticles, articles, getLatestArticles, offTrackGolfDay, obd2LiveDataArticle, toyota2JzArticle, type ArticleSummary } from '../../lib/torquegirl-content';

test('latest selects newest publications across every category, without changing registry order', () => {
  const before = allArticles.map(a => a.path);
  assert.deepEqual(getLatestArticles().map(a => a.path), [offTrackGolfDay.path, obd2LiveDataArticle.path, toyota2JzArticle.path]);
  assert.deepEqual(allArticles.map(a => a.path), before);
  assert.equal(getLatestArticles(articles, 1)[0], toyota2JzArticle);
});

test('a new publication becomes latest automatically, while date ties retain source order', () => {
  const future: ArticleSummary = { ...articles[0], slug: 'future-story', path: '/engines/future-story', date: '2027-01-01' };
  const tie: ArticleSummary = { ...future, slug: 'same-day', path: '/technology/same-day' };
  const source = [articles[1], future, articles[2], tie];
  assert.deepEqual(getLatestArticles(source, 4), [future, tie, articles[1], articles[2]]);
  assert.deepEqual(getLatestArticles(source, 0), []);
  assert.deepEqual(getLatestArticles(source, -1), []);
  assert.deepEqual(getLatestArticles([], 3), []);
  assert.equal(getLatestArticles(source, 99).length, 4);
});

test('registry has unique canonical paths, valid publication dates and correct editorial-label routing', () => {
  assert.equal(new Set(allArticles.map(a => a.path)).size, allArticles.length);
  for (const article of allArticles) {
    assert.match(article.path, /^\/(engines|technology|off-track)\/[a-z0-9-]+$/);
    assert.ok(article.path.endsWith('/' + article.slug));
    assert.equal(new Date(article.date).toISOString().slice(0, 10), article.date);
  }
  assert.equal(toyota2JzArticle.path, '/engines/toyota-2jz-gte-tuning-legend');
});
