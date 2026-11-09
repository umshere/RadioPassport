/**
* Real photos for the artist chips, all from Wikimedia Commons under free
* licences, shrunk to 200px and served from /artists. The credits page lists
* each file with its author and licence. Artists with no free photo get a tile.
*/
export type ArtistPhoto = { src: string; page: string; license: string; author: string };

export const ARTIST_PHOTOS: Record<string, ArtistPhoto> = {
  "khruangbin": { src: "/artists/khruangbin.jpg", page: "https://commons.wikimedia.org/wiki/File:Khruangbin_am_Haldern_Pop_Festival_2019_-_09_-_Foto_Alexander_Kellner.jpg", license: "CC BY-SA 4.0", author: "Alexander Kellner" },
  "radiohead": { src: "/artists/radiohead.jpg", page: "https://commons.wikimedia.org/wiki/File:RadioheadO2211125_composite.jpg", license: "CC BY 4.0", author: "Raph_PH" },
  "yesudas": { src: "/artists/yesudas.jpg", page: "https://commons.wikimedia.org/wiki/File:K.J_Yesudas.JPG", license: "CC BY-SA 4.0", author: "E P Sajeevan" },
  "kalabhavan-mani": { src: "/artists/kalabhavan-mani.jpg", page: "https://commons.wikimedia.org/wiki/File:KalabhavanManiMay2010.JPG", license: "CC BY-SA 3.0", author: "ShajiA" },
  "beatles": { src: "/artists/beatles.jpg", page: "https://commons.wikimedia.org/wiki/File:The_Beatles_1963_Dezo_Hoffman_Capitol_Records_press_photo_2.jpg", license: "Public domain", author: "Dezo Hoffmann, Distributed by Capitol Records" },
  "coldplay": { src: "/artists/coldplay.jpg", page: "https://commons.wikimedia.org/wiki/File:ColdplayWembley120925_(cropped).jpg", license: "CC BY 4.0", author: "Raph_PH" },
  "queen": { src: "/artists/queen.jpg", page: "https://commons.wikimedia.org/wiki/File:Queen_A_Night_At_The_Opera_(1975_Elektra_publicity_photo_02).jpg", license: "Public domain", author: "Koh Hasebe; Distributed by Elektra Records" },
  "led-zeppelin": { src: "/artists/led-zeppelin.jpg", page: "https://commons.wikimedia.org/wiki/File:Led_Zeppelin_-_promotional_image_(1971).jpg", license: "Public domain", author: "Atlantic Records" },
  "elvis": { src: "/artists/elvis.jpg", page: "https://commons.wikimedia.org/wiki/File:Elvis_Presley_promoting_Jailhouse_Rock.jpg", license: "Public domain", author: "Metro-Goldwyn-Mayer, Inc. Reproduction Number: LC-USZ6-2067 Location: " },
  "michael-jackson": { src: "/artists/michael-jackson.jpg", page: "https://commons.wikimedia.org/wiki/File:Michael_Jackson_1983_(3x4_cropped)_(contrast).jpg", license: "Public domain", author: "Matthew Rolston; Distributed by Epic Records" },
  "bob-marley": { src: "/artists/bob-marley.jpg", page: "https://commons.wikimedia.org/wiki/File:Bob_Marley_circa_1976_(cropped).jpg", license: "Public domain", author: "Not credited" },
  "fairuz": { src: "/artists/fairuz.jpg", page: "https://commons.wikimedia.org/wiki/File:Fairuz_1971.jpg", license: "Public domain", author: "photographer unknown, published by AP" },
  "kishore-kumar": { src: "/artists/kishore-kumar.jpg", page: "https://commons.wikimedia.org/wiki/File:Kishore_Kumar_2016_postcard_of_India_(cropped).jpg", license: "GODL-India", author: "India Post, Government of India" },
  "lata-mangeshkar": { src: "/artists/lata-mangeshkar.jpg", page: "https://commons.wikimedia.org/wiki/File:Lata_Mangeshkar_-_still_29065_crop.jpg", license: "CC BY 3.0", author: "Bollywood Hungama" },
  "mohammed-rafi": { src: "/artists/mohammed-rafi.jpg", page: "https://commons.wikimedia.org/wiki/File:Mohammed_Rafi_2016_postcard_of_India_crop-flip.jpg", license: "GODL-India", author: "India Post, Government of India" },
  "ar-rahman": { src: "/artists/ar-rahman.jpg", page: "https://commons.wikimedia.org/wiki/File:AR_Rahman_at_Premier_Futsal_Press_Meet_(cropped).jpg", license: "CC BY-SA 4.0", author: "Sriram Narasimhan" },
  "arijit-singh": { src: "/artists/arijit-singh.jpg", page: "https://commons.wikimedia.org/wiki/File:Arijit_Singh_performance_at_Chandigarh_2025.jpg", license: "CC BY 4.0", author: "Monit2004" },
};
