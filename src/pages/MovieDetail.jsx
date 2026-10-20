import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMovieStore } from '../store/useMovieStore';

export const MovieDetail = () => {

  // 주소줄에 매개값을 받아서 사용하기
  const { id } = useParams();

  const movieId = Number(id);


  // 팝업창을 체크하기 위한 변수
  const [showPopup, setShowPopup] = useState(false);


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
    popMovies,
    popVideo,
    onFetchVideo
  } = useMovieStore();


  // 파라메터로 넘어온 영화 id와
  // 같은 영화를 popMovies에서 찾기
  const movie = popMovies.find(
    (m) => m.id === movieId
  );


  // 영화 id에 해당하는 영상 가져오기
  useEffect(() => {

    if (movieId) {
      onFetchVideo(movieId);
    }

  }, [movieId, onFetchVideo]);


  // 영상정보
  const video = popVideo[movieId];


  // Trailer 영상 찾기
  const trailer = video?.find(
    (v) =>
      v.site === "YouTube" &&
      v.type === "Trailer"
  );


  return (

    <section className='sub-page py-30'>


      {/* 영화 정보 */}

      <div className="inner flex gap-15">


        {/* 포스터 */}

        <div className='w-2/6'>

          <img
            src={
              movie?.poster_path
                ? `https://image.tmdb.org/t/p/original${movie.poster_path}`
                : '/images/no-image.png'
            }
            alt={movie?.title || "영화 포스터"}
          />

        </div>



        {/* 영화 정보 */}

        <div className='w-4/6'>

          <h2 className='text-5xl'>

            {movie?.title}

          </h2>


          <p>

            {movie?.vote_average}

          </p>


          <p className='my-10'>

            {movie?.overview}

          </p>



          {/* 버튼 */}

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



      {/* 영상 팝업 */}

      {showPopup && trailer && (

        <div className='fixed bg-black w-full h-full top-0 left-0 z-[10000]'>


          {/* 닫기 */}

          <button
            onClick={handleClose}
            className='absolute right-5 top-5 bg-white p-2 z-10'
          >

            닫기

          </button>



          {/* Youtube 영상 */}

          <iframe
            className="w-full h-full"
            src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1&mute=1`}
            title={`${movie?.title} 예고편`}
            allow="autoplay; encrypted-media"
            allowFullScreen
          >
          </iframe>


        </div>

      )}


    </section>

  )

}