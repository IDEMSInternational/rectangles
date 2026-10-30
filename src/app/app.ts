import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PuzzleHome } from '@studio/container/puzzle-home/puzzle-home';
import { PuzzleNotice } from '@studio/container/puzzle-notice/puzzle-notice';
import { PuzzleScreens } from '@studio/container/puzzle-screens';
import { PuzzleShell } from '@studio/container/puzzle-shell/puzzle-shell';
import { PuzzleSplash } from '@studio/container/puzzle-splash/puzzle-splash';
import { PuzzleSwitch } from '@studio/container/puzzle-switch/puzzle-switch';
import { PuzzleTutorial } from '@studio/container/puzzle-tutorial/puzzle-tutorial';
import { storedSetting } from '@studio/container/stored-setting';
import { RectanglesBoard } from '../games/rectangles/board/rectangles-board';
import { rectanglesGame } from '../games/rectangles/rectangles-game';
import { rectanglesTutorial } from '../games/rectangles/tutorial';

import { version } from '../../package.json';

@Component({
  selector: 'app-root',
  imports: [PuzzleHome, PuzzleNotice, PuzzleShell, PuzzleSplash, PuzzleSwitch, PuzzleTutorial, RectanglesBoard],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly game = rectanglesGame;
  /** Home page, free play, daily puzzles and the tutorial. */
  protected readonly screens = new PuzzleScreens(rectanglesGame, rectanglesTutorial, version);
  /** Lock: rectangles can't be drawn over existing ones. Remembered on the device. */
  protected readonly locked = storedSetting(`${rectanglesGame.id}.lock`);
}
