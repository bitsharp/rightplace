import { fireEvent, render, screen } from '@testing-library/react-native';

import { Glow } from '@/components/ui/Glow';
import { gradientStops } from '@/test/svgGradient';
import { colors } from '@/theme/tokens';

import { HotSpot } from './HotSpot';

type Node = { props: Record<string, unknown>; children: (Node | string)[] };

// The halo is an SVG gradient named after its colour (see Glow): that is what the test can see.
function glowColor(): unknown {
  const find = (node: Node | string): unknown => {
    if (typeof node === 'string') return undefined;
    if (typeof node.props.name === 'string' && node.props.name.startsWith('glow-'))
      return node.props.name;
    return node.children.map(find).find((color) => color !== undefined);
  };
  return find(screen.getByTestId('hot-spot-glow', { includeHiddenElements: true }) as never);
}

describe('HotSpot: presenze stimate', () => {
  it('non disegna nessun segno ≈ e l’etichetta accessibile è quella normale', async () => {
    await render(
      <HotSpot
        venueName="Navigli"
        goingBand="20–30"
        maybeBand="pochi"
        {...{ isEstimate: true }}
        onPress={jest.fn()}
      />,
    );
    expect(
      screen.queryByTestId('hot-spot-estimate', { includeHiddenElements: true }),
    ).not.toBeOnTheScreen();
    expect(screen.queryByText('≈', { includeHiddenElements: true })).not.toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: /^ui:hotSpot\.a11y\(/, includeHiddenElements: true }),
    ).toBeOnTheScreen();
  });
});

describe('HotSpot: intensità per affluenza', () => {
  const outer = () => screen.getByTestId('hot-spot-outer', { includeHiddenElements: true });
  const flat = (style: unknown) => Object.assign({}, ...[style].flat(Infinity));
  const opacityOf = () => (flat(outer().props.style).opacity as number | undefined) ?? 1;

  it('alta: colore pieno, bagliore e fascia scritta', async () => {
    await render(<HotSpot venueName="A" goingBand="30–50" maybeBand="pochi" onPress={jest.fn()} />);
    expect(screen.getByTestId('hot-spot-glow', { includeHiddenElements: true })).toBeOnTheScreen();
    expect(screen.getByText('30–50', { includeHiddenElements: true })).toBeOnTheScreen();
    expect(opacityOf()).toBe(1);
  });

  it('media: colore più tenue, niente bagliore, fascia scritta', async () => {
    await render(<HotSpot venueName="A" goingBand="20–30" maybeBand="pochi" onPress={jest.fn()} />);
    expect(
      screen.queryByTestId('hot-spot-glow', { includeHiddenElements: true }),
    ).not.toBeOnTheScreen();
    expect(screen.getByText('20–30', { includeHiddenElements: true })).toBeOnTheScreen();
    expect(opacityOf()).toBeLessThan(1);
  });

  it('bassa: pallino più piccolo e più tenue, senza bagliore né scritta', async () => {
    const { rerender } = await render(
      <HotSpot venueName="A" goingBand="3–10" maybeBand="pochi" onPress={jest.fn()} />,
    );
    const lowOpacity = opacityOf();
    const lowSize = flat(outer().props.style).width as number;
    expect(
      screen.queryByTestId('hot-spot-glow', { includeHiddenElements: true }),
    ).not.toBeOnTheScreen();
    expect(screen.queryByText('3–10', { includeHiddenElements: true })).not.toBeOnTheScreen();
    expect(
      screen.queryByText('ui:band.few', { includeHiddenElements: true }),
    ).not.toBeOnTheScreen();
    await rerender(
      <HotSpot venueName="A" goingBand="20–30" maybeBand="pochi" onPress={jest.fn()} />,
    );
    expect(lowOpacity).toBeLessThan(opacityOf());
    expect(lowSize).toBeLessThan(flat(outer().props.style).width as number);
  });

  it('bassa: la fascia resta nell’etichetta accessibile', async () => {
    await render(<HotSpot venueName="A" goingBand="3–10" maybeBand="pochi" onPress={jest.fn()} />);
    expect(
      screen.getByRole('button', {
        name: 'ui:hotSpot.a11y({"venue":"A","going":"3–10","maybe":"ui:band.few"})',
        includeHiddenElements: true,
      }),
    ).toBeOnTheScreen();
  });

  it('con la didascalia degli amici scrive sempre il numero, anche su un punto tenue', async () => {
    await render(
      <HotSpot venueName="A" goingBand="pochi" maybeBand="pochi" caption="2" onPress={jest.fn()} />,
    );
    expect(screen.getByText('2', { includeHiddenElements: true })).toBeOnTheScreen();
  });
});

describe('HotSpot', () => {
  it('ha il diametro della fascia dominante e la mostra come label', async () => {
    await render(
      <HotSpot venueName="Navigli" goingBand="50–100" maybeBand="30–50" onPress={jest.fn()} />,
    );
    expect(screen.getByTestId('hot-spot-outer', { includeHiddenElements: true })).toHaveStyle({
      width: 100,
      height: 100,
    });
    expect(screen.getByText('50–100', { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it('è viola quando dominano i "Ci vado" e ciano quando dominano i "Forse"', async () => {
    const { rerender } = await render(
      <HotSpot venueName="A" goingBand="30–50" maybeBand="10–20" onPress={jest.fn()} />,
    );
    expect(screen.getByTestId('hot-spot-outer', { includeHiddenElements: true })).toHaveStyle({
      borderColor: colors.going,
    });
    await rerender(
      <HotSpot venueName="A" goingBand="pochi" maybeBand="20–30" onPress={jest.fn()} />,
    );
    expect(screen.getByTestId('hot-spot-outer', { includeHiddenElements: true })).toHaveStyle({
      borderColor: colors.maybe,
    });
  });

  it('la label è sempre la fascia dei "Ci vado", anche se dominano i "Forse"', async () => {
    await render(<HotSpot venueName="A" goingBand="pochi" maybeBand="20–30" onPress={jest.fn()} />);
    expect(screen.getByText('ui:band.few', { includeHiddenElements: true })).toBeOnTheScreen();
    expect(screen.queryByText('20–30', { includeHiddenElements: true })).not.toBeOnTheScreen();
  });

  it('scrive "pochi" tradotto invece di un numero', async () => {
    await render(<HotSpot venueName="A" goingBand="pochi" maybeBand="pochi" onPress={jest.fn()} />);
    expect(
      screen.queryByTestId('hot-spot-inner', { includeHiddenElements: true }),
    ).not.toBeOnTheScreen();
    expect(screen.queryByText(/\d/, { includeHiddenElements: true })).not.toBeOnTheScreen();
  });

  it('disegna il cerchio interno della fascia secondaria', async () => {
    await render(<HotSpot venueName="A" goingBand="30–50" maybeBand="10–20" onPress={jest.fn()} />);
    expect(screen.getByTestId('hot-spot-inner', { includeHiddenElements: true })).toHaveStyle({
      borderColor: colors.maybe,
    });
  });

  it('è un bottone accessibile che apre il locale', async () => {
    const onPress = jest.fn();
    await render(
      <HotSpot venueName="Navigli" goingBand="30–50" maybeBand="pochi" onPress={onPress} />,
    );
    await fireEvent.press(
      screen.getByRole('button', {
        name: 'ui:hotSpot.a11y({"venue":"Navigli","going":"30–50","maybe":"ui:band.few"})',
      }),
    );
    expect(onPress).toHaveBeenCalled();
  });

  it('mostra una didascalia al posto della fascia sulla mappa amici', async () => {
    await render(
      <HotSpot venueName="A" goingBand="pochi" maybeBand="pochi" caption="2" onPress={jest.fn()} />,
    );
    expect(screen.getByText('2', { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it('ha un bagliore viola quando dominano i "Ci vado" e ciano quando dominano i "Forse"', async () => {
    const { rerender } = await render(
      <HotSpot venueName="A" goingBand="30–50" maybeBand="10–20" onPress={jest.fn()} />,
    );
    expect(screen.getByTestId('hot-spot-glow', { includeHiddenElements: true })).toBeOnTheScreen();
    expect(glowColor()).toBe(`glow-${colors.going.replace('#', '')}`);
    await rerender(
      <HotSpot venueName="A" goingBand="pochi" maybeBand="30–50" onPress={jest.fn()} />,
    );
    expect(glowColor()).toBe(`glow-${colors.maybe.replace('#', '')}`);
  });

  it('il bagliore sta dentro l’area del marker e il cerchio resta al centro, così non viene tagliato', async () => {
    await render(
      <HotSpot venueName="A" goingBand="50–100" maybeBand="pochi" onPress={jest.fn()} />,
    );
    const glow = screen.getByTestId('hot-spot-glow', { includeHiddenElements: true });
    const [container] = [screen.getByRole('button', { hidden: true })];
    const flat = (style: unknown) => Object.assign({}, ...[style].flat(Infinity));
    expect(flat(container.props.style).width).toBeGreaterThanOrEqual(flat(glow.props.style).width);
  });

  it('il bagliore è più acceso di quello di base, a parità di dimensioni per fascia', async () => {
    const opacities = (testID: string) =>
      gradientStops(screen.getByTestId(testID, { includeHiddenElements: true }))[0]?.map(
        (stop) => stop.alpha,
      ) ?? [];
    await render(
      <>
        <HotSpot venueName="A" goingBand="30–50" maybeBand="pochi" onPress={jest.fn()} />
        <Glow testID="base-glow" radius={10} />
      </>,
    );
    const hot = opacities('hot-spot-glow');
    const base = opacities('base-glow');
    expect(hot[1] ?? 0).toBeGreaterThan(base[1] ?? 1);
    expect(hot[0] ?? 2).toBeLessThanOrEqual(1);
  });
});

describe('HotSpot: fascia su una riga', () => {
  it('il testo della fascia sta su una riga e si rimpicciolisce invece di andare a capo', async () => {
    await render(
      <HotSpot venueName="Navigli" goingBand="10–20" maybeBand="pochi" onPress={jest.fn()} />,
    );
    const label = screen.getByText('10–20', { includeHiddenElements: true });
    expect(label.props.numberOfLines).toBe(1);
    expect(label.props.adjustsFontSizeToFit).toBe(true);
    expect(label.props.minimumFontScale).toBeGreaterThanOrEqual(0.6);
  });
});
