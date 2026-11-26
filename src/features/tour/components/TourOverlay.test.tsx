import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, Text } from 'react-native';

import { mockMeasureInWindow, resetMeasureInWindow } from '@/test/measure';
import { markTourSeen } from '@/test/tourState';

import { useTourStore } from '../store/tourStore';
import { TourAnchor } from './TourAnchor';
import { TourOverlay } from './TourOverlay';

let mockFocused = true;
jest.mock('expo-router', () => ({ useIsFocused: () => mockFocused }));

const ANCHOR = { x: 20, y: 120, width: 200, height: 40 };
// The bubble is modal for the screen reader, so everything around it is hidden from queries on purpose.
const HIDDEN = { includeHiddenElements: true };
const GOT_IT = { name: 'tour:tip.gotIt' };
const TOGGLE_TIP = 'tour:tips.map.viewToggle';
const HOT_SPOT_TIP = 'tour:tips.map.hotSpot';

function MapScreenWithTips({ withHotSpot = true }: { withHotSpot?: boolean }) {
  return (
    <>
      <TourAnchor id="map.viewToggle">
        <Text>toggle</Text>
      </TourAnchor>
      {withHotSpot ? (
        <TourAnchor id="map.hotSpot">
          <Text>controls</Text>
        </TourAnchor>
      ) : null}
      <TourOverlay screen="map" />
    </>
  );
}

// Sulla guida da vedere per la prima volta: benvenuto già visto, nessun fumetto visto.
function startAsFirstTimeOnScreens() {
  markTourSeen();
  useTourStore.setState({ seenSteps: [] });
}

describe('TourOverlay', () => {
  beforeEach(() => {
    mockFocused = true;
    mockMeasureInWindow(ANCHOR);
    startAsFirstTimeOnScreens();
  });
  afterEach(() => resetMeasureInWindow());

  it('mostra il primo fumetto non visto quando l’ancora è misurata', async () => {
    await render(<MapScreenWithTips />);
    expect(screen.getByText(TOGGLE_TIP)).toBeOnTheScreen();
  });

  it('mostra un fumetto alla volta', async () => {
    await render(<MapScreenWithTips />);
    expect(screen.queryByText(HOT_SPOT_TIP)).not.toBeOnTheScreen();
    expect(screen.getAllByRole('button', GOT_IT)).toHaveLength(1);
  });

  it('“Ho capito” segna il fumetto come visto e passa al successivo, poi nessuno', async () => {
    await render(<MapScreenWithTips />);
    await fireEvent.press(screen.getByRole('button', GOT_IT));
    expect(useTourStore.getState().seenSteps).toEqual(['map.viewToggle']);
    expect(screen.getByText(HOT_SPOT_TIP)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', GOT_IT));
    expect(screen.queryByRole('button', GOT_IT)).not.toBeOnTheScreen();
    expect(useTourStore.getState().seenSteps).toEqual(['map.viewToggle', 'map.hotSpot']);
  });

  it('un tap fuori dal fumetto lo chiude come “Ho capito”', async () => {
    await render(<MapScreenWithTips />);
    await fireEvent.press(screen.getByTestId('tour-backdrop', HIDDEN));
    expect(useTourStore.getState().seenSteps).toContain('map.viewToggle');
  });

  it('un tap sul fumetto lo chiude', async () => {
    await render(<MapScreenWithTips />);
    await fireEvent.press(screen.getByText(TOGGLE_TIP));
    expect(useTourStore.getState().seenSteps).toContain('map.viewToggle');
  });

  it('un fumetto già visto non ricompare', async () => {
    useTourStore.setState({ seenSteps: ['map.viewToggle'] });
    await render(<MapScreenWithTips />);
    expect(screen.queryByText(TOGGLE_TIP)).not.toBeOnTheScreen();
    expect(screen.getByText(HOT_SPOT_TIP)).toBeOnTheScreen();
  });

  it('se l’ancora non c’è, quel fumetto aspetta e passa al successivo', async () => {
    useTourStore.setState({ seenSteps: ['map.viewToggle'] });
    await render(<TourOverlay screen="map" />);
    expect(screen.queryByRole('button', GOT_IT)).not.toBeOnTheScreen();
    expect(useTourStore.getState().seenSteps).toEqual(['map.viewToggle']);
  });

  it('salta il fumetto senza ancora e mostra il successivo', async () => {
    await render(<MapScreenWithTips withHotSpot={false} />);
    await fireEvent.press(screen.getByRole('button', GOT_IT));
    expect(screen.queryByRole('button', GOT_IT)).not.toBeOnTheScreen();
  });

  it('non compare se la schermata non è a fuoco', async () => {
    mockFocused = false;
    await render(<MapScreenWithTips />);
    expect(screen.queryByText(TOGGLE_TIP)).not.toBeOnTheScreen();
  });

  it('non compare prima che il benvenuto sia stato visto', async () => {
    useTourStore.setState({ welcomeSeen: false });
    await render(<MapScreenWithTips />);
    expect(screen.queryByText(TOGGLE_TIP)).not.toBeOnTheScreen();
  });

  it('il fumetto è modale per il lettore di schermo e il focus va sul testo', async () => {
    const sendEvent = jest.spyOn(AccessibilityInfo, 'sendAccessibilityEvent');
    await render(<MapScreenWithTips />);
    expect(screen.getByTestId('tour-bubble').props.accessibilityViewIsModal).toBe(true);
    expect(sendEvent).toHaveBeenCalledWith(expect.anything(), 'focus');
  });

  it('disegna il buco attorno all’ancora', async () => {
    await render(<MapScreenWithTips />);
    expect(screen.getByTestId('tour-spotlight', HIDDEN)).toBeOnTheScreen();
  });

  describe('Riduci movimento', () => {
    it('con Riduci movimento il fumetto è subito opaco, senza animazione', async () => {
      jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
      await render(<MapScreenWithTips />);
      await act(async () => undefined);
      expect(screen.getByTestId('tour-bubble')).not.toHaveStyle({ opacity: 0 });
    });

    it('senza Riduci movimento il fumetto compare con una dissolvenza', async () => {
      jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
      await render(<MapScreenWithTips />);
      expect(screen.getByTestId('tour-bubble')).toHaveStyle({ opacity: 0 });
    });
  });
});
