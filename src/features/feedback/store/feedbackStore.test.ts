import { resetFeedback, useFeedback } from './feedbackStore';

describe('feedbackStore', () => {
  beforeEach(() => resetFeedback());

  it('all’inizio non c’è nessuna bozza aperta', () => {
    expect(useFeedback.getState().draft).toBeNull();
  });

  it('open apre la bozza con schermata e screenshot', () => {
    useFeedback.getState().open({ screen: '/map', screenshotUri: 'file:///s.jpg' });
    expect(useFeedback.getState().draft).toEqual({
      screen: '/map',
      screenshotUri: 'file:///s.jpg',
    });
  });

  it('removeScreenshot toglie solo lo screenshot', () => {
    useFeedback.getState().open({ screen: '/map', screenshotUri: 'file:///s.jpg' });
    useFeedback.getState().removeScreenshot();
    expect(useFeedback.getState().draft).toEqual({ screen: '/map', screenshotUri: null });
  });

  it('close scarta la bozza, screenshot compreso', () => {
    useFeedback.getState().open({ screen: '/map', screenshotUri: 'file:///s.jpg' });
    useFeedback.getState().close();
    expect(useFeedback.getState().draft).toBeNull();
  });
});
