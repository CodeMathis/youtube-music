import { createPlugin } from '@/utils';
import registerCallback from '@/providers/song-info';
import { t } from '@/i18n';

type SongInfo = {
  songDuration?: number;
  elapsedSeconds?: number;
  url?: string;
  videoId?: string;
  playlistId?: string;
  imageSrc?: string | null;
  title?: string;
  artist?: string;
  isPaused?: boolean;
  album?: string | null;
  views?: number;
};

type LumiaData = {
  origin: string;
  eventType: string;
  url?: string;
  videoId?: string;
  playlistId?: string;
  cover?: string | null;
  cover_url?: string | null;
  title?: string;
  artists?: string[];
  status?: string;
  progress?: number;
  duration?: number;
  album_url?: string | null;
  album?: string | null;
  views?: number;
  isPaused?: boolean;
};

export default createPlugin({
  name: () => t('plugins.lumiastream.name'),
  description: () => t('plugins.lumiastream.description'),
  restartNeeded: true,
  config: {
    enabled: false,
  },
  backend({ ipc }) {
    const port = 39231;
    const token = 'lsmedia_ytmsI7812';

    const secToMilisec = (t?: number): number | undefined =>
      t ? Math.round(t * 1000) : undefined;

    let lastTitle = '';

    const sendToLumia = (eventType: string, songInfo: SongInfo) => {
      if (!songInfo.title || !songInfo.artist) {
        // console.error('Données de chanson invalides.');
        return;
      }

      const data: LumiaData = {
        origin: 'youtubemusic',
        eventType,
        duration: secToMilisec(songInfo.songDuration),
        progress: secToMilisec(songInfo.elapsedSeconds),
        url: songInfo.url,
        videoId: songInfo.videoId,
        playlistId: songInfo.playlistId,
        cover: songInfo.imageSrc || null,
        cover_url: songInfo.imageSrc || null,
        album_url: songInfo.imageSrc || null,
        title: songInfo.title,
        artists: [songInfo.artist],
        status: 'playing',
        isPaused: songInfo.isPaused,
        album: songInfo.album || null,
        views: songInfo.views,
      };

      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Origin': '*',
      } as const;

      const url = `http://127.0.0.1:${port}/api/media`;

      fetch(url, {
        method: 'POST',
        body: JSON.stringify({ token, data }),
        headers,
      }).catch((error: { code?: number; errno?: number }) => {
        console.error(
          `LumiaStream Error: '${
            error.code || error.errno || 'unknown'
          }' - Failed to connect to port ${port}`,
        );
      });
    };

    ipc.on('ytmd:player-api-loaded', () =>
      ipc.send('ytmd:setup-time-changed-listener'),
    );

    registerCallback((songInfo: SongInfo) => {
      if (!songInfo.title || !songInfo.artist) {
        // console.log('Aucune chanson valide detectee. Ignorer...');
        return;
      }

      if (songInfo.title !== lastTitle) {
        // console.log(`Chanson changee: ${songInfo.title}`);
        sendToLumia('switchSong', songInfo);
        lastTitle = songInfo.title;
      }
    });
  },
});
