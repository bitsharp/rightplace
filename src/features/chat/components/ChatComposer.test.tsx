import { fireEvent, render, screen } from '@testing-library/react-native';

import { ChatComposer } from './ChatComposer';

const following = ['lince.rosso', 'lupo.nero', 'volpe.viola'];

async function setup(props: Partial<React.ComponentProps<typeof ChatComposer>> = {}) {
  const onSend = jest.fn();
  const onPhoto = jest.fn();
  const onFollow = jest.fn();
  await render(
    <ChatComposer
      followingHandles={following}
      myHandle="gatto.blu"
      requestedHandles={[]}
      onSend={onSend}
      onPhoto={onPhoto}
      onFollow={onFollow}
      {...props}
    />,
  );
  return { onSend, onPhoto, onFollow, input: screen.getByLabelText('chat:composer.placeholder') };
}

describe('ChatComposer', () => {
  it('scrivendo @ propone solo chi seguo, per prefisso', async () => {
    const { input } = await setup();
    await fireEvent.changeText(input, 'ciao @l');
    expect(screen.getByText('@lince.rosso')).toBeOnTheScreen();
    expect(screen.getByText('@lupo.nero')).toBeOnTheScreen();
    expect(screen.queryByText('@volpe.viola')).toBeNull();
    expect(screen.getByText('chat:composer.mentionHint')).toBeOnTheScreen();
  });

  it('scegliere un suggerimento completa il tag nel testo', async () => {
    const { input } = await setup();
    await fireEvent.changeText(input, 'ciao @lu');
    await fireEvent.press(screen.getByText('@lupo.nero'));
    expect(input.props.value).toBe('ciao @lupo.nero ');
    expect(screen.queryByText('chat:composer.mentionHint')).toBeNull();
  });

  it('un tag a qualcuno che non seguo mostra il chip Segui, e un tocco chiede il follow', async () => {
    const { input, onFollow } = await setup();
    await fireEvent.changeText(input, 'ehi @orso.verde vieni?');
    expect(screen.getByText('@orso.verde')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('chat:composer.follow'));
    expect(onFollow).toHaveBeenCalledWith('orso.verde');
  });

  it('un tag a chi seguo o a me stesso non mostra nessun chip', async () => {
    const { input } = await setup();
    await fireEvent.changeText(input, '@lince.rosso e @gatto.blu ');
    expect(screen.queryByText('chat:composer.follow')).toBeNull();
  });

  it('invia il testo senza spazi attorno e svuota il campo', async () => {
    const { input, onSend } = await setup();
    await fireEvent.changeText(input, '  ci vediamo alle 11  ');
    await fireEvent.press(screen.getByLabelText('chat:composer.send'));
    expect(onSend).toHaveBeenCalledWith('ci vediamo alle 11');
    expect(screen.getByLabelText('chat:composer.placeholder').props.value).toBe('');
  });

  it('non invia un testo vuoto', async () => {
    const { input, onSend } = await setup();
    await fireEvent.changeText(input, '   ');
    await fireEvent.press(screen.getByLabelText('chat:composer.send'));
    expect(onSend).not.toHaveBeenCalled();
  });

  it('il bottone foto apre la scelta della sorgente', async () => {
    const { onPhoto } = await setup();
    await fireEvent.press(screen.getByLabelText('chat:composer.photo'));
    expect(onPhoto).toHaveBeenCalledTimes(1);
  });
});
