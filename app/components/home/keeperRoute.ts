import type { Station } from "~/types/radio";
import { VOICE } from "~/components/keeper/keeperVoice";

export type KeeperRoute = {
  title: string;
  intro: string;
  stops: readonly {
    station: Station;
    name: string;
    reason: string;
    sourceLabel: string;
    sourceUrl: string;
  }[];
};

/**
 * A small editorial route connecting live station streams to dated,
 * broadcaster-owned Khruangbin archives. Archive links are not now-playing
 * claims and are kept separate from the station stream URLs.
 */
export const HOME_KEEPER_ROUTE: KeeperRoute = {
  title: VOICE.homeKeeperRouteTitle,
  intro: VOICE.homeKeeperRouteIntro,
  stops: [
    {
      station: {
        uuid: "e9fddd49-3ee2-4597-8574-1b7dbd00aac0",
        name: "KEXP 90.3 FM Seattle",
        url: "https://kexp-mp3-128.streamguys1.com/kexp128.mp3",
        streamUrl: "https://kexp-mp3-128.streamguys1.com/kexp128.mp3",
        favicon: "https://www.kexp.org/static/assets/img/logo-black.svg",
        country: "The United States Of America",
        countryCode: "US",
        state: null,
        city: null,
        language: "english",
        languageCodes: ["en"],
        tags: "alternative,eclectic,electronic,folk,indie,jazz,pop,rock",
        tagList: ["alternative", "eclectic", "electronic", "folk", "indie", "jazz", "pop", "rock"],
        bitrate: 128,
        codec: "MP3",
        homepage: "https://www.kexp.org/",
        hls: false,
      },
      name: "KEXP",
      reason: VOICE.homeKeeperRouteKexpReason,
      sourceLabel: VOICE.homeKeeperRouteKexpArchive,
      sourceUrl: "https://kexp.org/watch/khruangbin-full-performance-live-on-kexp/",
    },
    {
      station: {
        uuid: "a3dbc189-d23e-4308-803f-5aad26432b8c",
        name: "NTS Radio Channel 1",
        url: "https://stream-relay-geo.ntslive.net/stream",
        streamUrl: "https://stream-relay-geo.ntslive.net/stream",
        favicon: "https://www.nts.live/apple-touch-icon.png?v=47re43rrzb",
        country: "",
        countryCode: null,
        state: null,
        city: null,
        language: "english",
        languageCodes: ["en"],
        tags: "",
        tagList: [],
        bitrate: 256,
        codec: "MP3",
        homepage: "https://www.nts.live/schedule",
        hls: false,
      },
      name: "NTS Radio Channel 1",
      reason: VOICE.homeKeeperRouteNtsReason,
      sourceLabel: VOICE.homeKeeperRouteNtsArchive,
      sourceUrl: "https://www.nts.live/shows/khruangbin",
    },
  ],
};
