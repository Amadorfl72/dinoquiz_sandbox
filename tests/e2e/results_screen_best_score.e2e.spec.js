import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import ResultsScreen from '@/components/ResultsScreen.vue';
import * as scoreRepository from '@/repositories/scoreRepository';

describe('TRIOFSND-46: ResultsScreen best score — component mount (e2e-style)', () => {
  let fetchBestScoreSpy;

  beforeEach(() => {
    fetchBestScoreSpy = vi.spyOn(scoreRepository, 'fetchBestScore');
  });

  afterEach(() => {
    fetchBestScoreSpy.mockRestore();
  });

  it('mounts and displays both current score and best score sections', async () => {
    fetchBestScoreSpy.mockResolvedValue(88);

    const wrapper = mount(ResultsScreen, {
      props: { currentScore: 42 },
    });

    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();

    const html = wrapper.html();
    expect(html).toContain('42');
    expect(html).toContain('88');
    expect(html.toLowerCase()).toContain('best score');
    expect(html.toLowerCase()).toContain('your score');
  });

  it('renders accessible labels for screen readers', async () => {
    fetchBestScoreSpy.mockResolvedValue(77);

    const wrapper = mount(ResultsScreen, {
      props: { currentScore: 55 },
    });

    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();

    const bestScoreRegion = wrapper.find('[aria-label="Best score"]');
    const currentScoreRegion = wrapper.find('[aria-label="Your score"]');

    expect(bestScoreRegion.exists()).toBe(true);
    expect(currentScoreRegion.exists()).toBe(true);
    expect(bestScoreRegion.text()).toContain('77');
    expect(currentScoreRegion.text()).toContain('55');
  });

  it('renders the best score value with a testid for integration test targeting', async () => {
    fetchBestScoreSpy.mockResolvedValue(99);

    const wrapper = mount(ResultsScreen, {
      props: { currentScore: 10 },
    });

    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();

    const bestScoreEl = wrapper.find('[data-testid="best-score-value"]');
    expect(bestScoreEl.exists()).toBe(true);
    expect(bestScoreEl.text()).toBe('99');
  });

  it('renders the current score value with a testid for integration test targeting', async () => {
    fetchBestScoreSpy.mockResolvedValue(99);

    const wrapper = mount(ResultsScreen, {
      props: { currentScore: 33 },
    });

    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();

    const currentScoreEl = wrapper.find('[data-testid="current-score-value"]');
    expect(currentScoreEl.exists()).toBe(true);
    expect(currentScoreEl.text()).toBe('33');
  });
});
