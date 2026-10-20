import { create } from "zustand";

// TMDB API 키
const TMDB_KEY = import.meta.env.VITE_TMDB_API_KEY;

// YouTube API 키
const YOUTUBE_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;


export const useMovieStore = create((set, get) => ({

    // ==================================================
    // 영화 인기
    // ==================================================

    popMovies: [],

    onFetchPopular: async () => {

        const res = await fetch(
            `https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_KEY}&language=ko-KR&page=1`
        );

        const data = await res.json();

        set({
            popMovies: data.results || []
        });

    },


    // ==================================================
    // 영화 영상
    // ==================================================

    popVideo: {},

    onFetchVideo: async (id) => {

        const { popVideo } = get();

        if (popVideo[id]) {
            return popVideo[id];
        }

        const res = await fetch(
            `https://api.themoviedb.org/3/movie/${id}/videos?api_key=${TMDB_KEY}&language=ko-KR`
        );

        const data = await res.json();

        const videos = data.results || [];

        set((state) => ({
            popVideo: {
                ...state.popVideo,
                [id]: videos
            }
        }));

        return videos;

    },


    // ==================================================
    // TV 인기
    // ==================================================

    tvs: [],

    onFetchTv: async () => {

        const res = await fetch(
            `https://api.themoviedb.org/3/tv/popular?api_key=${TMDB_KEY}&language=ko-KR&page=1`
        );

        const data = await res.json();

        console.log("인기티비", data);

        set({
            tvs: data.results || []
        });

    },


    // ==================================================
    // TV 영상
    // ==================================================

    tvVideo: {},

    onFetchTvVideo: async (id) => {

        const { tvVideo } = get();

        if (tvVideo[id]) {
            return tvVideo[id];
        }

        const res = await fetch(
            `https://api.themoviedb.org/3/tv/${id}/videos?api_key=${TMDB_KEY}&language=en-US`
        );

        const data = await res.json();

        const videos = data.results || [];

        set((state) => ({
            tvVideo: {
                ...state.tvVideo,
                [id]: videos
            }
        }));

        return videos;

    },


    // ==================================================
    // 시즌
    // ==================================================

    seasons: [],

    onFetchSeason: async (id) => {

        const res = await fetch(
            `https://api.themoviedb.org/3/tv/${id}?api_key=${TMDB_KEY}&language=ko-KR`
        );

        const data = await res.json();

        console.log("시즌", data.seasons);

        set({
            seasons: data.seasons || []
        });

    },


    // ==================================================
    // 시즌별 에피소드
    // ==================================================

    episodes: [],

    onFetchEpisode: async (id, season) => {

        const res = await fetch(
            `https://api.themoviedb.org/3/tv/${id}/season/${season}?api_key=${TMDB_KEY}&language=ko-KR`
        );

        const data = await res.json();

        console.log("에피소드", data.episodes);

        set({
            episodes: data.episodes || []
        });

    },


    // ==================================================
    // 개별 에피소드 영상
    // ==================================================

    episodeVideos: {},

    onFetchEpisodeVideo: async (
        tvId,
        seasonNumber,
        episodeNumber
    ) => {

        const key =
            `${tvId}-${seasonNumber}-${episodeNumber}`;

        const { episodeVideos } = get();


        // 이미 불러온 영상이 있으면 재사용
        if (episodeVideos[key]) {
            return episodeVideos[key];
        }


        try {

            // ==========================================
            // 1. TMDB에서 에피소드 영상 검색
            // ==========================================

            const tmdbVideoRes = await fetch(
                `https://api.themoviedb.org/3/tv/${tvId}/season/${seasonNumber}/episode/${episodeNumber}/videos?api_key=${TMDB_KEY}&language=en-US`
            );

            const tmdbVideoData =
                await tmdbVideoRes.json();

            const tmdbVideos =
                tmdbVideoData.results || [];


            const tmdbYoutubeVideos =
                tmdbVideos.filter(
                    (video) =>
                        video.site === "YouTube"
                );


            // TMDB에 영상이 있으면 바로 사용
            if (tmdbYoutubeVideos.length > 0) {

                set((state) => ({
                    episodeVideos: {
                        ...state.episodeVideos,
                        [key]: tmdbYoutubeVideos
                    }
                }));

                return tmdbYoutubeVideos;
            }


            // ==========================================
            // 2. TV 정보 가져오기
            // ==========================================

            const tvRes = await fetch(
                `https://api.themoviedb.org/3/tv/${tvId}?api_key=${TMDB_KEY}&language=en-US`
            );

            const tvData =
                await tvRes.json();


            const tvName =
                tvData.original_name ||
                tvData.name ||
                "";


            // ==========================================
            // 3. 해당 에피소드 정보 가져오기
            // ==========================================

            const episodeRes = await fetch(
                `https://api.themoviedb.org/3/tv/${tvId}/season/${seasonNumber}/episode/${episodeNumber}?api_key=${TMDB_KEY}&language=en-US`
            );

            const episodeData =
                await episodeRes.json();


            const episodeName =
                episodeData.name || "";


            // ==========================================
            // 4. YouTube 검색어
            // ==========================================

            const searchQuery =
                `${tvName} Season ${seasonNumber} Episode ${episodeNumber} ${episodeName} official clip trailer`;


            console.log(
                "유튜브 검색어",
                searchQuery
            );


            // ==========================================
            // YouTube API 키 확인
            // ==========================================

            if (!YOUTUBE_KEY) {

                console.error(
                    "VITE_YOUTUBE_API_KEY가 없습니다."
                );

                set((state) => ({
                    episodeVideos: {
                        ...state.episodeVideos,
                        [key]: []
                    }
                }));

                return [];
            }


            // ==========================================
            // 5. YouTube 검색
            // ==========================================

            const youtubeRes = await fetch(
                `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=5&videoEmbeddable=true&safeSearch=moderate&q=${encodeURIComponent(searchQuery)}&key=${YOUTUBE_KEY}`
            );

            const youtubeData =
                await youtubeRes.json();


            console.log(
                "YouTube 검색 결과",
                youtubeData
            );


            // YouTube API 오류
            if (youtubeData.error) {

                console.error(
                    "YouTube API 오류",
                    youtubeData.error
                );

                set((state) => ({
                    episodeVideos: {
                        ...state.episodeVideos,
                        [key]: []
                    }
                }));

                return [];
            }


            // ==========================================
            // YouTube 데이터를 기존 영상 형태로 변경
            // ==========================================

            const youtubeVideos =
                (youtubeData.items || [])

                    .filter(
                        (item) =>
                            item.id?.videoId
                    )

                    .map((item) => ({

                        id:
                            item.id.videoId,

                        key:
                            item.id.videoId,

                        site:
                            "YouTube",

                        type:
                            "Clip",

                        name:
                            item.snippet?.title ||
                            `${tvName} S${seasonNumber} E${episodeNumber}`,

                        channelName:
                            item.snippet?.channelTitle || "",

                        thumbnail:
                            item.snippet?.thumbnails?.high?.url ||
                            item.snippet?.thumbnails?.medium?.url ||
                            item.snippet?.thumbnails?.default?.url ||
                            ""

                    }));


            console.log(
                "최종 YouTube 영상",
                youtubeVideos
            );


            // ==========================================
            // Zustand에 저장
            // ==========================================

            set((state) => ({
                episodeVideos: {
                    ...state.episodeVideos,
                    [key]: youtubeVideos
                }
            }));


            return youtubeVideos;


        } catch (error) {

            console.error(
                "에피소드 영상 불러오기 실패",
                error
            );


            set((state) => ({
                episodeVideos: {
                    ...state.episodeVideos,
                    [key]: []
                }
            }));


            return [];
        }

    }

}));