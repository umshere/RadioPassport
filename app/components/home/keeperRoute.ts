import type { Station } from "~/types/radio";
import { VOICE } from "~/components/keeper/keeperVoice";

export type KeeperRoute = {
  id: string;
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
  id: "khruangbin",
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

/**
 * Artist routes: one live stream dedicated to the artist, paired with a
 * stable page about them. Copy says only what the station data supports
 * (a stream given to the artist), never what is playing now.
 */
const RADIOHEAD_ROUTE: KeeperRoute = {
  id: "radiohead",
  title: VOICE.homeKeeperRouteRadioheadTitle,
  intro: VOICE.homeKeeperRouteArtistIntro,
  stops: [
    {
      station: {
        uuid: "5b368f1a-a1ea-480d-950e-c3f353b1af7c",
        name: "Exclusively - Radiohead",
        url: "https://streaming.exclusive.radio/er/radiohead/icecast.audio",
        streamUrl: "https://streaming.exclusive.radio/er/radiohead/icecast.audio",
        favicon: "",
        country: "The United Arab Emirates",
        countryCode: "AE",
        state: "Dubai",
        city: null,
        language: "english",
        languageCodes: ["en"],
        tags: "exclusive,radiohead",
        tagList: ["exclusive", "radiohead"],
        bitrate: 128,
        codec: "MP3",
        homepage: "https://play.you.radio/",
        hls: false,
      },
      name: "Exclusively Radiohead",
      reason: VOICE.homeKeeperRouteRadioheadReason,
      sourceLabel: VOICE.homeKeeperRouteRadioheadSource,
      sourceUrl: "https://www.radiohead.com/",
    },
  ],
};

const YESUDAS_ROUTE: KeeperRoute = {
  id: "yesudas",
  title: VOICE.homeKeeperRouteYesudasTitle,
  intro: VOICE.homeKeeperRouteArtistIntro,
  stops: [
    {
      station: {
        uuid: "4dbdab26-dd91-4b89-8219-c11e9a99efea",
        name: "KJ Yesudas Malayalam radio",
        url: "https://stream.zeno.fm/9x1sw687nf9uv",
        streamUrl: "https://stream.zeno.fm/9x1sw687nf9uv",
        favicon: "https://onlineradiohub.com/wp-content/uploads/2023/03/Yesudas-Radio.jpg",
        country: "India",
        countryCode: "IN",
        state: null,
        city: null,
        language: "malayalam",
        languageCodes: ["ml"],
        tags: "",
        tagList: [],
        bitrate: 128,
        codec: "MP3",
        homepage: "",
        hls: false,
      },
      name: "KJ Yesudas radio",
      reason: VOICE.homeKeeperRouteYesudasReason,
      sourceLabel: VOICE.homeKeeperRouteYesudasSource,
      sourceUrl: "https://en.wikipedia.org/wiki/K._J._Yesudas",
    },
  ],
};

/** Every route Home offers, in order. Add an artist by adding a route here. */
export const KEEPER_ROUTES: readonly KeeperRoute[] = [
  HOME_KEEPER_ROUTE,
  RADIOHEAD_ROUTE,
  YESUDAS_ROUTE,
];
