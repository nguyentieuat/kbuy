// pages/Home.tsx

import HeroSlider from '../components/HeroSlider'
import PromoBanner from '../components/PromoBanner'
import NewArrivalCarousel from '../components/containers/NewArrivalCarousel'
import FeaturedProductsGrid from '../components/containers/FeaturedProductsGrid'

export default function Home() {
  return (
    <>
      <HeroSlider />
      
      <FeaturedProductsGrid />

      <PromoBanner />

      <NewArrivalCarousel />

    </>
  )
}