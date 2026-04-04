import { useEffect } from 'react';
import { registerSW } from 'virtual:pwa-register';

export const PWAUpdater = () => {
  useEffect(() => {
    const updateSW = registerSW({
      onNeedRefresh() {
        const shouldUpdate = window.confirm('A new version of Twin Roll is available. Update now?');
        if (shouldUpdate) {
          updateSW(true);
          console.info(`Twin Roll updated successfully to v${__APP_VERSION__}`);
        } else {
          console.info('Update postponed. Current version maintained.');
        }
      },
    });
  }, []);

  return null;
};
