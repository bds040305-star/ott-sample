import { useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore';


export const Login = () => {

  const navigate = useNavigate();
  const location = useLocation();


  // 전역변수
  const { onGoogleLogin } = useAuthStore();


  const handleGoogleLogin = async () => {

    const user = await onGoogleLogin();


    if (user) {

      navigate(location.state?.from === "/sports" ? "/sports" : "/selectMember");

    }

  }


  return (

    <section className='sub-page pt-25'>

      <div className="inner">


        <h2 className="section-title text-3xl font-bold">

          Login

        </h2>


        <p>

          <button

            className='border p-4'

            onClick={handleGoogleLogin}

          >

            구글 로그인

          </button>

        </p>


      </div>

    </section>

  )

}