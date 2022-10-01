"use strict";
const { fetch } = require("undici");
let baseURL =
  /(?:https:\/\/music\.apple\.com\/)(?:.+)?(artist|album|music-video|playlist)\/([\w\-\.]+(\/)+[\w\-\.]+|[^&]+)\/([\w\-\.]+(\/)+[\w\-\.]+|[^&]+)/;

class AppleMusic {
  constructor(options = {}) {
    this.url = `https://amp-api.music.apple.com/v1/catalog/${
      options.searchMarket || "IN"
    }`;
    this.token = null;
    this.fetch = fetch
    this.getToken();
  }

  check(url) {
    return baseURL.test(url);
  }

  async getToken() {
    try {
      let req = await fetch("https://music.apple.com/us/browse");
      let json = await req.text();
      let config =
        /<meta name="desktop-music-app\/config\/environment" content="(.*?)">/.exec(
          json
        );

      let key = (config = JSON.parse(decodeURIComponent(config[1])));
      let { token } = key?.MEDIA_API;

      if (!token) throw new Error("No acess key found for apple music");

      this.token = `Bearer ${token}`;
    } catch (e) {
      if (e.status === 400) {
        throw new Error(`[Poru Apple Music]:${e}`);
      }
    }
  }

  async getData(param) {
    if (!this.token) await this.getToken();

    let req = await this.fetch(`${this.url}${param}`, {
      headers: {
        Authorization: `${this.token}`,
        origin: "https://music.apple.com",
      },
    });

    let body = await req.json();

    return body;
  }

  async search(query) {
    let [, type] = baseURL.exec(query) ?? [];

    switch (type) {
      case "playlist": {
        return this.getPlaylist(query);
      }
      case "album": {
        return this.getAlbum(query);
      }
      case "artist": {
        return this.getArtist(query);
      }
      default: {
        return this.getSongByWords(query);
      }
    }
  }

  async getSongByWords(query) {
    let tracks = await this.getData(`/search?types=songs&term=${query}`);
    return tracks;
  }

  async getPlaylist(url) {
    let query = new URL(url).pathname.split("/");
    let id = query.pop();
    let playlist = await this.getData(`/playlists/${id}`);
    return playlist;
  }

  async getAlbum(url) {
    let query = new URL(url).pathname.split("/");
    let id = query.pop();
    let album = await this.getData(`/albums/${id}`);
    return album;
  }

  async geArtist(url) {
    let query = new URL(url).pathname.split("/");
    let id = query.pop();
    let artist = await this.getData(`/attists/${id}`);
    return artist;
  }
}

module.exports = AppleMusic;
