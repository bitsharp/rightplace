import { ageBandLabel } from './personMeta';

describe('ageBandLabel', () => {
  it('mostra le fasce con il trattino lungo', () => {
    expect(ageBandLabel('18-24')).toBe('18–24');
    expect(ageBandLabel('35-44')).toBe('35–44');
  });

  it('lascia invariata la fascia aperta', () => {
    expect(ageBandLabel('45+')).toBe('45+');
  });
});
