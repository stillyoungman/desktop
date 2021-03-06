import {
  app,
  dialog,
  Menu,
  MenuItemConstructorOptions,
  shell,
  WebContents,
} from 'electron';
import { MessageType } from '../../../test/TestIpcMessage';
import { ArchiveManager } from './archiveManager';
import { isMac } from './platforms';
import { SpellcheckerManager } from './spellcheckerManager';
import { Store, StoreKeys } from './store';
import { appMenu as str } from './strings';
import { TrayManager } from './trayManager';
import { UpdateManager } from './updateManager';
import { isDev, isTesting } from './utils';
import { handle } from './testing';

export const enum MenuId {
  SpellcheckerLanguages = 'SpellcheckerLanguages',
}

export function editorContextMenu(
  misspelledWord: string,
  dictionarySuggestions: string[],
  webContents: WebContents
): MenuItemConstructorOptions[] {
  return [
    ...suggestionsMenu(misspelledWord, dictionarySuggestions, webContents),
    {
      role: 'undo',
    },
    {
      role: 'redo',
    },
    {
      type: 'separator',
    },
    {
      role: 'cut',
    },
    {
      role: 'copy',
    },
    {
      role: 'paste',
    },
    {
      role: 'pasteAndMatchStyle',
    },
    {
      role: 'selectAll',
    },
  ];
}

function suggestionsMenu(
  misspelledWord: string,
  suggestions: string[],
  webContents: WebContents
): MenuItemConstructorOptions[] {
  if (misspelledWord.length === 0) {
    return [];
  }
  if (suggestions.length === 0) {
    return [
      {
        label: 'No suggestions',
        enabled: false,
      },
      {
        type: 'separator',
      },
    ];
  }

  return [
    ...suggestions.map((suggestion) => ({
      label: suggestion,
      click() {
        webContents.replaceMisspelling(suggestion);
      },
    })),
    {
      type: 'separator',
    },
  ];
}

export interface MenuManager {
  reload(): void;
  popupMenu(): void;
}

export function createMenuManager({
  window,
  archiveManager,
  updateManager,
  trayManager,
  store,
  spellcheckerManager,
}: {
  window: Electron.BrowserWindow;
  archiveManager: ArchiveManager;
  updateManager: UpdateManager;
  trayManager: TrayManager;
  store: Store;
  spellcheckerManager?: SpellcheckerManager;
}): MenuManager {
  let menu: Menu;

  function reload() {
    menu = Menu.buildFromTemplate([
      ...(isMac() ? [macAppMenu(app.name)] : []),
      editMenu(spellcheckerManager, reload),
      viewMenu(window, store, reload),
      windowMenu(store, trayManager, reload),
      backupsMenu(archiveManager, reload),
      updateMenu(updateManager),
      helpMenu(window, shell),
    ]);
    Menu.setApplicationMenu(menu);
  }
  reload(); // initialization

  updateManager.onNeedMenuReload = reload;

  if (isTesting()) {
    handle(MessageType.AppMenuItems, () =>
      menu.items.map((item) => ({
        label: item.label,
        role: item.role,
        submenu: {
          items: item.submenu?.items?.map((subItem) => ({
            id: subItem.id,
            label: subItem.label,
          })),
        },
      }))
    );
    handle(MessageType.ClickLanguage, (code) => {
      menu.getMenuItemById(MessageType.ClickLanguage + code)!.click();
    });
  }

  return {
    reload,
    popupMenu() {
      if (isDev()) {
        /** Check the state */
        if (!menu) throw new Error('called popupMenu() before loading');
      }
      // eslint-disable-next-line no-unused-expressions
      menu?.popup();
    },
  };
}

const enum Roles {
  Undo = 'undo',
  Redo = 'redo',
  Cut = 'cut',
  Copy = 'copy',
  Paste = 'paste',
  PasteAndMatchStyle = 'pasteAndMatchStyle',
  SelectAll = 'selectAll',
  Reload = 'reload',
  ToggleDevTools = 'toggleDevTools',
  ResetZoom = 'resetZoom',
  ZoomIn = 'zoomIn',
  ZoomOut = 'zoomOut',
  ToggleFullScreen = 'togglefullscreen',
  Window = 'window',
  Minimize = 'minimize',
  Close = 'close',
  Help = 'help',
  About = 'about',
  Services = 'services',
  Hide = 'hide',
  HideOthers = 'hideOthers',
  UnHide = 'unhide',
  Quit = 'quit',
  StartSeeking = 'startSpeaking',
  StopSeeking = 'stopSpeaking',
  Zoom = 'zoom',
  Front = 'front',
}

const KeyCombinations = {
  CmdOrCtrlW: 'CmdOrCtrl + W',
  CmdOrCtrlM: 'CmdOrCtrl + M',
  AltM: 'Alt + m',
};

const enum MenuItemTypes {
  CheckBox = 'checkbox',
  Radio = 'radio',
}

const Separator: MenuItemConstructorOptions = {
  type: 'separator',
};

const Urls = {
  Support: 'mailto:help@standardnotes.org',
  Website: 'https://standardnotes.org',
  GitHub: 'https://github.com/standardnotes',
  Slack: 'https://standardnotes.org/slack',
  Twitter: 'https://twitter.com/StandardNotes',
  GitHubReleases: 'https://github.com/standardnotes/desktop/releases',
};

function macAppMenu(appName: string): MenuItemConstructorOptions {
  return {
    role: 'appMenu',
    label: appName,
    submenu: [
      {
        role: Roles.About,
      },
      Separator,
      {
        role: Roles.Services,
        submenu: [],
      },
      Separator,
      {
        role: Roles.Hide,
      },
      {
        role: Roles.HideOthers,
      },
      {
        role: Roles.UnHide,
      },
      Separator,
      {
        role: Roles.Quit,
      },
    ],
  };
}

function editMenu(
  spellcheckerManager: SpellcheckerManager | undefined,
  reload: () => any
): MenuItemConstructorOptions {
  if (isDev()) {
    /** Check for invalid state */
    if (!isMac() && spellcheckerManager === undefined) {
      throw new Error('spellcheckerManager === undefined');
    }
  }

  return {
    role: 'editMenu',
    label: str().edit,
    submenu: [
      {
        role: Roles.Undo,
      },
      {
        role: Roles.Redo,
      },
      Separator,
      {
        role: Roles.Cut,
      },
      {
        role: Roles.Copy,
      },
      {
        role: Roles.Paste,
      },
      {
        role: Roles.PasteAndMatchStyle,
      },
      {
        role: Roles.SelectAll,
      },
      ...(isMac()
        ? [Separator, macSpeechMenu()]
        : [spellcheckerMenu(spellcheckerManager!, reload)]),
    ],
  };
}

function macSpeechMenu(): MenuItemConstructorOptions {
  return {
    label: str().speech,
    submenu: [
      {
        role: Roles.StopSeeking,
      },
      {
        role: Roles.StopSeeking,
      },
    ],
  };
}

function spellcheckerMenu(
  spellcheckerManager: SpellcheckerManager,
  reload: () => any
): MenuItemConstructorOptions {
  return {
    id: MenuId.SpellcheckerLanguages,
    label: str().spellcheckerLanguages,
    submenu: spellcheckerManager.languages().map(
      ({ name, code, enabled }): MenuItemConstructorOptions => ({
        ...(isTesting() ? { id: MessageType.ClickLanguage + code } : {}),
        label: name,
        type: MenuItemTypes.CheckBox,
        checked: enabled,
        click: () => {
          if (enabled) {
            spellcheckerManager.removeLanguage(code);
          } else {
            spellcheckerManager.addLanguage(code);
          }
          reload();
        },
      })
    ),
  };
}

function viewMenu(
  window: Electron.BrowserWindow,
  store: Store,
  reload: () => any
): MenuItemConstructorOptions {
  return {
    label: str().view,
    submenu: [
      {
        role: Roles.Reload,
      },
      {
        role: Roles.ToggleDevTools,
      },
      Separator,
      {
        role: Roles.ResetZoom,
      },
      {
        role: Roles.ZoomIn,
      },
      {
        role: Roles.ZoomOut,
      },
      Separator,
      {
        role: Roles.ToggleFullScreen,
      },
      ...(isMac() ? [] : [Separator, ...menuBarOptions(window, store, reload)]),
    ],
  };
}

function menuBarOptions(
  window: Electron.BrowserWindow,
  store: Store,
  reload: () => any
) {
  const useSystemMenuBar = store.get(StoreKeys.UseSystemMenuBar);
  let isMenuBarVisible = store.get(StoreKeys.MenuBarVisible);
  window.setMenuBarVisibility(isMenuBarVisible);
  return [
    {
      visible: !isMac() && useSystemMenuBar,
      label: str().hideMenuBar,
      accelerator: KeyCombinations.AltM,
      click: () => {
        isMenuBarVisible = !isMenuBarVisible;
        window.setMenuBarVisibility(isMenuBarVisible);
        store.set(StoreKeys.MenuBarVisible, isMenuBarVisible);
      },
    },
    {
      label: str().useThemedMenuBar,
      type: MenuItemTypes.CheckBox,
      checked: !useSystemMenuBar,
      click: () => {
        store.set(StoreKeys.UseSystemMenuBar, !useSystemMenuBar);
        reload();
        dialog.showMessageBox({
          title: str().preferencesChanged.title,
          message: str().preferencesChanged.message,
        });
      },
    },
  ];
}

function windowMenu(
  store: Store,
  trayManager: TrayManager,
  reload: () => any
): MenuItemConstructorOptions {
  return {
    role: Roles.Window,
    submenu: [
      {
        role: Roles.Minimize,
      },
      {
        role: Roles.Close,
      },
      Separator,
      ...(isMac()
        ? macWindowItems()
        : [minimizeToTrayItem(store, trayManager, reload)]),
    ],
  };
}

function macWindowItems(): MenuItemConstructorOptions[] {
  return [
    {
      label: str().close,
      accelerator: KeyCombinations.CmdOrCtrlW,
      role: Roles.Close,
    },
    {
      label: str().minimize,
      accelerator: KeyCombinations.CmdOrCtrlM,
      role: Roles.Minimize,
    },
    {
      label: str().zoom,
      role: Roles.Zoom,
    },
    Separator,
    {
      label: str().bringAllToFront,
      role: Roles.Front,
    },
  ];
}

function minimizeToTrayItem(
  store: Store,
  trayManager: TrayManager,
  reload: () => any
) {
  const minimizeToTray = trayManager.shouldMinimizeToTray();
  return {
    label: str().minimizeToTrayOnClose,
    type: MenuItemTypes.CheckBox,
    checked: minimizeToTray,
    click() {
      store.set(StoreKeys.MinimizeToTray, !minimizeToTray);
      if (trayManager.shouldMinimizeToTray()) {
        trayManager.createTrayIcon();
      } else {
        trayManager.destroyTrayIcon();
      }
      reload();
    },
  };
}

function backupsMenu(archiveManager: ArchiveManager, reload: () => any) {
  return {
    label: str().backups,
    submenu: [
      {
        label: archiveManager.backupsAreEnabled
          ? str().disableAutomaticBackups
          : str().enableAutomaticBackups,
        click() {
          archiveManager.toggleBackupsStatus();
          reload();
        },
      },
      Separator,
      {
        label: str().changeBackupsLocation,
        click() {
          archiveManager.changeBackupsLocation();
        },
      },
      {
        label: str().openBackupsLocation,
        click() {
          shell.openItem(archiveManager.backupsLocation);
        },
      },
    ],
  };
}

function updateMenu(updateManager: UpdateManager) {
  const updateNeeded = updateManager.updateNeeded();
  let label;
  if (updateManager.checkingForUpdate) {
    label = str().checkingForUpdate;
  } else if (updateNeeded) {
    label = str().updateAvailable;
  } else {
    label = str().updates;
  }
  const submenu: MenuItemConstructorOptions[] = [];
  const structure = { label, submenu };

  if (updateManager.autoUpdateDownloaded) {
    submenu.push({
      label: str().installPendingUpdate(
        updateManager.autoUpdateDownloadedVersion()
      ),
      click() {
        updateManager.showAutoUpdateInstallationDialog();
      },
    });
  }

  submenu.push({
    label: updateManager.autoUpdateEnabled
      ? str().automaticUpdatesEnabled
      : str().automaticUpdatesDisabled,
    click() {
      updateManager.toggleAutoupdateStatus();
    },
  });

  submenu.push(Separator);

  if (updateManager.lastCheck && !updateManager.checkingForUpdate) {
    submenu.push({
      label: str().lastUpdateCheck(updateManager.lastCheck),
    });
  }

  if (!updateManager.checkingForUpdate) {
    submenu.push({
      label: str().checkForUpdate,
      click() {
        updateManager.checkForUpdate({ userTriggered: true });
      },
    });
  }

  submenu.push(Separator);

  submenu.push({
    label: str().yourVersion(updateManager.currentVersion),
  });

  const latestVersion = updateManager.latestVersion;
  submenu.push({
    label: latestVersion
      ? str().latestVersion(latestVersion)
      : str().errorRetrieving,
    click() {
      updateManager.openChangelog();
    },
  });

  submenu.push(Separator);

  if (latestVersion) {
    submenu.push({
      label: str().viewReleaseNotes(latestVersion),
      click() {
        updateManager.openChangelog();
      },
    });
  }

  if (updateManager.manualUpdateDownloaded) {
    submenu.push({
      label: str().openDownloadLocation,
      click() {
        updateManager.openDownloadLocation();
      },
    });
  } else if (updateNeeded || updateManager.downloadingUpdate) {
    submenu.push({
      label: updateManager.downloadingUpdate
        ? str().downloadingUpdate
        : str().manuallyDownloadUpdate,
      click() {
        updateManager.downloadingUpdate
          ? updateManager.openDownloadLocation()
          : updateManager.downloadUpdateFile();
      },
    });
  }

  return structure;
}

function helpMenu(window: Electron.BrowserWindow, shell: Electron.Shell) {
  return {
    role: Roles.Help,
    submenu: [
      {
        label: str().emailSupport,
        click() {
          shell.openExternal(Urls.Support);
        },
      },
      {
        label: str().website,
        click() {
          shell.openExternal(Urls.Website);
        },
      },
      {
        label: str().gitHub,
        click() {
          shell.openExternal(Urls.GitHub);
        },
      },
      {
        label: str().slack,
        click() {
          shell.openExternal(Urls.Slack);
        },
      },
      {
        label: str().twitter,
        click() {
          shell.openExternal(Urls.Twitter);
        },
      },
      Separator,
      {
        label: str().toggleErrorConsole,
        click() {
          window.webContents.toggleDevTools();
        },
      },
      {
        label: str().openDataDirectory,
        click() {
          const userDataPath = app.getPath('userData');
          shell.openItem(userDataPath);
        },
      },
      {
        label: str().clearCacheAndReload,
        async click() {
          await window.webContents.session.clearCache();
          window.reload();
        },
      },
      Separator,
      {
        label: str().version(app.getVersion()),
        click() {
          shell.openExternal(Urls.GitHubReleases);
        },
      },
    ],
  };
}
