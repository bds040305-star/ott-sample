import { Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'

const mainMenu = [
    { id: 1, menu: "영화", path: "/movie" },
    { id: 2, menu: "시리즈", path: "/series" },
    { id: 3, menu: "NEW 요즘 대세 콘텐츠", path: "/new" },
    { id: 4, menu: "애니메이션", path: "/animate" },
    { id: 5, menu: "찜리스트", path: "/heart" },
    { id: 6, menu: "스포츠", path: "/sports" },
]

export const Header = () => {

    // 경로
    const location = useLocation();

    // 로그인 사용자 / 현재 멤버
    const { user, currentMember } = useAuthStore();

    const isHome = location.pathname === "/";
    const isSports = location.pathname === "/sports";

    return (
        <header
            className={`fixed z-10000 w-full py-5 ${isSports ? 'sports-site-header' : ''} ${
                isHome
                    ? "bg-transparent"
                    : isSports ? "bg-[#0b0e15] border-b border-white/10" : "bg-green-500"
            }`}
        >

            <div className="inner flex justify-between items-center">

                <div className="header-left flex gap-10 items-center">

                    <h1>
                        <Link to="/">
                            <img
                                src="/images/logo.png"
                                alt="logo"
                                className='w-40'
                            />
                        </Link>
                    </h1>


                    <ul className='flex gap-5'>

                        {mainMenu.map((menu) => (

                            <li key={menu.id}>

                                <Link
                                    aria-current={location.pathname.toLowerCase() === menu.path ? 'page' : undefined}
                                    className={
                                        isHome || isSports
                                            ? (isSports && menu.path === '/sports' ? "text-[#c6eb85] font-bold" : "text-white")
                                            : "text-black"
                                    }
                                    to={menu.path}
                                >
                                    {menu.menu}
                                </Link>

                            </li>

                        ))}

                    </ul>

                </div>


                <div
                    className={`header-right ${
                        isHome || isSports
                            ? "text-white"
                            : "text-black"
                    }`}
                >

                    <ul className='flex gap-5'>

                        <li>
                            <button>
                                검색
                            </button>
                        </li>


                        {user ? (

                            <>

                                <li>

                                    <button>
                                        {currentMember || "프로필"}
                                    </button>

                                </li>

                            </>

                        ) : (

                            <>

                                <li>
                                    <Link to="/login">
                                        로그인
                                    </Link>
                                </li>

                                <li>
                                    <Link to="/join">
                                        회원가입
                                    </Link>
                                </li>

                            </>

                        )}

                    </ul>

                </div>

            </div>

        </header>
    )
}
