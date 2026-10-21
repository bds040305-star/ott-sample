import { Route, Routes } from 'react-router-dom'
import './App.css'
import { Home } from './pages/Home'
import { Movie } from './pages/Movie'
import { Series } from './pages/Series'
import { New } from './pages/New'
import { Animation } from './pages/Animation'
import { Heart } from './pages/Heart'
import { MovieDetail } from './pages/MovieDetail'
import { TvDetail } from './pages/TvDetail'
import { Login } from './pages/Login'
import { SelectMember } from './pages/SelectMember'
import { Profile } from './pages/Profile'
import { Join } from './pages/Join'
import { Footer } from './components/Footer'
import { Header } from './components/Header'
import { Sports } from './pages/Sports'

function App() {
  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/movie" element={<Movie />} />
        <Route path="/series" element={<Series />} />
        <Route path="/new" element={<New />} />
        <Route path="/animate" element={<Animation />} />
        <Route path="/Heart" element={<Heart />} />
        <Route path="/sports" element={<Sports />} />

        <Route path="/movie/:id" element={<MovieDetail />} />
        <Route path="/tv/:id" element={<TvDetail />} />

        <Route path="/login" element={<Login />} />
        <Route path="/selectMember" element={<SelectMember />} />
        <Route paht="/profile" element={<Profile />} />
        <Route path="/join" element={<Join />} />

      </Routes>
      <Footer />
    </>
  )
}

export default App
