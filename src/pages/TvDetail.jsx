import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMovieStore } from '../store/useMovieStore';

export const TvDetail = () => {

  // 주소줄에 매개값을 받아서 사용하기
  const { id } = useParams();

  const tvId = Number(id);


  // 팝업창을 체크하기 위한 변수
  const [showPopup, setShowPopup] = useState(false);


  // 현재 선택된 시즌
  const [selectedSeason, setSelectedSeason] = useState(null);


  // 현재 선택한 에피소드 영상
  const [episodeVideo, setEpisodeVideo] = useState(null);


  // 에피소드 영상 팝업
  const [showEpisodePopup, setShowEpisodePopup] =
    useState(false);



  // 팝업 열기
  const handlePopup = () => {

    setShowPopup(true);

  }


  // 팝업 닫기
  const handleClose = () => {

    setShowPopup(false);

  }



  // Zustand
  const {

    tvs,
    tvVideo,

    seasons,
    episodes,

    onFetchTv,
    onFetchTvVideo,

    onFetchSeason,
    onFetchEpisode,

    onFetchEpisodeVideo

  } = useMovieStore();



  // 파라메터로 넘어온 TV id와
  // 같은 TV 프로그램을 tvs에서 찾기
  const tv = tvs.find(
    (item) => item.id === tvId
  );



  // TV 목록이 없으면 불러오기
  useEffect(() => {

    if (tvs.length === 0) {

      onFetchTv();

    }

  }, [tvs.length, onFetchTv]);



  // TV 영상 불러오기
  useEffect(() => {

    if (tvId) {

      onFetchTvVideo(tvId);

    }

  }, [tvId, onFetchTvVideo]);



  // TV 시즌 목록 불러오기
  useEffect(() => {

    if (tvId) {

      onFetchSeason(tvId);

    }

  }, [tvId, onFetchSeason]);



  // 시즌 데이터가 들어오면
  // 첫 번째 일반 시즌 자동 선택
  useEffect(() => {

    if (
      seasons.length > 0 &&
      selectedSeason === null
    ) {

      const firstSeason = seasons.find(
        (season) => season.season_number > 0
      );


      if (firstSeason) {

        setSelectedSeason(
          firstSeason.season_number
        );

      }

    }

  }, [seasons, selectedSeason]);



  // 선택된 시즌의 에피소드 불러오기
  useEffect(() => {

    if (
      tvId &&
      selectedSeason !== null
    ) {

      onFetchEpisode(
        tvId,
        selectedSeason
      );

    }

  }, [
    tvId,
    selectedSeason,
    onFetchEpisode
  ]);



  // 영상정보
  const video = tvVideo[tvId];



  // Trailer 또는 Teaser 찾기
  const trailer = video?.find(
    (v) =>
      v.site === "YouTube" &&
      (
        v.type === "Trailer" ||
        v.type === "Teaser"
      )
  );



  // ===============================
  // 에피소드 재생
  // ===============================

  const handleEpisodePlay = async (episode) => {

    const videos = await onFetchEpisodeVideo(

      tvId,

      selectedSeason,

      episode.episode_number

    );


    const playVideo =

      videos?.find(
        (v) =>
          v.site === "YouTube" &&
          v.type === "Trailer"
      )

      ||

      videos?.find(
        (v) =>
          v.site === "YouTube" &&
          v.type === "Teaser"
      )

      ||

      videos?.find(
        (v) =>
          v.site === "YouTube" &&
          v.type === "Clip"
      )

      ||

      videos?.find(
        (v) =>
          v.site === "YouTube"
      );


    if (!playVideo) {

      alert("이 에피소드의 영상이 없습니다.");

      return;

    }


    setEpisodeVideo({

      ...playVideo,

      name: episode.name,

      episodeNumber: episode.episode_number

    });


    setShowEpisodePopup(true);

  }



  // 에피소드 팝업 닫기
  const handleEpisodeClose = () => {

    setShowEpisodePopup(false);

    setEpisodeVideo(null);

  }



  return (

    <section className='sub-page py-30'>


      {/* TV 상세 정보 */}

      <div className="inner flex gap-15">


        {/* 포스터 */}

        <div className='w-2/6'>


          <img
            src={
              tv?.poster_path

                ? `https://image.tmdb.org/t/p/original${tv.poster_path}`

                : '/images/no-image.png'
            }

            alt={tv?.name || "TV 포스터"}
          />


        </div>



        {/* TV 정보 */}

        <div className='w-4/6'>


          <h2 className='text-5xl'>

            {tv?.name}

          </h2>



          <p>

            {tv?.vote_average}

          </p>



          <p className='my-10'>

            {tv?.overview}

          </p>



          <div className='flex gap-5'>


            <button

              className='bg-black text-white p-4'

              onClick={handlePopup}

              disabled={!trailer}
            >

              재생하기

            </button>



            <button className='border p-4'>

              찜하기

            </button>


          </div>


        </div>


      </div>



      {/* ========================= */}
      {/* 시즌 / 에피소드 */}
      {/* ========================= */}


      <div className="inner mt-20">


        <h2 className="text-3xl font-bold mb-8">

          에피소드

        </h2>



        {/* 시즌 선택 */}

        <div className="flex gap-3 mb-10 flex-wrap">


          {seasons

            .filter(
              (season) =>
                season.season_number > 0
            )

            .map((season) => (

              <button

                key={season.id}

                onClick={() => {

                  setSelectedSeason(
                    season.season_number
                  );

                }}

                className={`
                  px-6
                  py-3
                  border
                  rounded-full

                  ${
                    selectedSeason ===
                    season.season_number

                      ? "bg-black text-white"

                      : "bg-white text-black"
                  }
                `}
              >

                시즌 {season.season_number}

              </button>

            ))}


        </div>



        {/* ========================= */}
        {/* 에피소드 목록 */}
        {/* ========================= */}


        <div className="flex flex-col gap-8">


          {episodes.map((episode) => (

            <div

              key={episode.id}

              className="
                flex
                gap-6
                border-b
                pb-8
              "
            >



              {/* 에피소드 이미지 */}

              <div className="w-2/6 relative">


                {episode.still_path ? (

                  <img

                    src={`https://image.tmdb.org/t/p/w500${episode.still_path}`}

                    alt={episode.name}

                    className="
                      w-full
                      aspect-video
                      object-cover
                    "

                  />

                ) : (

                  <div
                    className="
                      w-full
                      aspect-video
                      bg-gray-200
                      flex
                      items-center
                      justify-center
                    "
                  >

                    이미지 없음

                  </div>

                )}



                {/* 이미지 위 재생버튼 */}

                <button

                  onClick={() =>
                    handleEpisodePlay(episode)
                  }

                  className="
                    absolute
                    top-1/2
                    left-1/2

                    -translate-x-1/2
                    -translate-y-1/2

                    w-14
                    h-14

                    bg-black/70
                    text-white

                    rounded-full

                    flex
                    items-center
                    justify-center
                  "
                >

                  ▶

                </button>


              </div>



              {/* 에피소드 정보 */}

              <div className="w-4/6">


                <div
                  className="
                    flex
                    gap-3
                    items-center
                    mb-3
                  "
                >


                  <span className="font-bold">

                    {episode.episode_number}화

                  </span>


                  <h3 className="text-xl font-bold">

                    {episode.name}

                  </h3>


                </div>



                {/* 평점 / 러닝타임 */}

                <p
                  className="
                    text-sm
                    text-gray-500
                    mb-4
                  "
                >


                  평점{" "}

                  {episode.vote_average
                    ?.toFixed(1)}


                  {episode.runtime && (

                    <>

                      {" · "}

                      {episode.runtime}분

                    </>

                  )}


                </p>



                {/* 줄거리 */}

                <p>

                  {episode.overview ||

                    "에피소드 소개가 없습니다."}

                </p>



                {/* 재생 버튼 */}

                <button

                  onClick={() =>
                    handleEpisodePlay(episode)
                  }

                  className="
                    mt-5
                    bg-black
                    text-white
                    px-5
                    py-3
                  "
                >

                  ▶ 재생하기

                </button>


              </div>


            </div>

          ))}


        </div>


      </div>



      {/* ========================= */}
      {/* TV 전체 예고편 */}
      {/* ========================= */}


      {showPopup && trailer && (

        <div className='fixed bg-black w-full h-full top-0 left-0 z-[10000]'>


          <button

            onClick={handleClose}

            className='absolute right-5 top-5 bg-white p-2 z-10'
          >

            닫기

          </button>



          <iframe

            className="w-full h-full"

            src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1&mute=1`}

            title={`${tv?.name} 예고편`}

            allow="autoplay; encrypted-media"

            allowFullScreen

          >
          </iframe>


        </div>

      )}



      {/* ========================= */}
      {/* 에피소드 영상 팝업 */}
      {/* ========================= */}


      {showEpisodePopup && episodeVideo && (

        <div
          className="
            fixed
            bg-black
            w-full
            h-full
            top-0
            left-0
            z-[10000]
          "
        >


          <button

            onClick={handleEpisodeClose}

            className="
              absolute
              right-5
              top-5
              bg-white
              text-black
              p-3
              z-10
            "
          >

            닫기

          </button>



          <iframe

            className="w-full h-full"

            src={
              `https://www.youtube.com/embed/${episodeVideo.key}?autoplay=1&mute=1`
            }

            title={episodeVideo.name}

            allow="autoplay; encrypted-media"

            allowFullScreen

          >
          </iframe>


        </div>

      )}


    </section>

  )

}