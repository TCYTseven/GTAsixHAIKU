export interface MenuCallbacks {
  onStart(): void;
  onResume(): void;
}

/** Title and pause screens as one DOM overlay. The game is paused while it is visible. */
export class Menus {
  readonly root: HTMLElement;
  private readonly title: HTMLElement;
  private readonly pause: HTMLElement;

  constructor(callbacks: MenuCallbacks) {
    this.root = document.createElement('div');
    this.root.id = 'menus';
    this.title = this.panel(
      'Vice Harbor',
      'WASD move, Shift sprint, Space jump, F enter or leave a car, Q melee, R reload, click to shoot.',
      'Start',
      callbacks.onStart,
    );
    this.pause = this.panel('Paused', 'Esc to resume.', 'Resume', callbacks.onResume);
    this.pause.hidden = true;
    this.root.append(this.title, this.pause);
    document.body.append(this.root);
  }

  showTitle(): void {
    this.root.hidden = false;
    this.title.hidden = false;
    this.pause.hidden = true;
  }

  showPause(): void {
    this.root.hidden = false;
    this.title.hidden = true;
    this.pause.hidden = false;
  }

  hide(): void {
    this.root.hidden = true;
  }

  private panel(
    heading: string,
    body: string,
    buttonLabel: string,
    onClick: () => void,
  ): HTMLElement {
    const section = document.createElement('div');
    section.className = 'menu-panel';
    const h = document.createElement('h1');
    h.textContent = heading;
    const p = document.createElement('p');
    p.textContent = body;
    const button = document.createElement('button');
    button.textContent = buttonLabel;
    button.addEventListener('click', onClick);
    section.append(h, p, button);
    return section;
  }
}
