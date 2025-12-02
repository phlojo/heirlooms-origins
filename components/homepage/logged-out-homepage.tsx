"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CollectionCard } from "@/components/collection-card"
import { CommunityShowcase } from "@/components/community-showcase"
import { ArtifactsCarousel } from "@/components/artifacts-carousel"
import { Upload, BookOpen, FolderOpen, Users, Palette, Heart, Sparkles, ArrowRight, ChevronDown, ChevronLeft, ChevronRight, Package, LayoutGrid } from "lucide-react"
import MediaImage from "@/components/media-image"
import BottomNav from "@/components/navigation/bottom-nav"
import { cn } from "@/lib/utils"

interface ShowcaseArtifact {
  id: string
  slug: string
  title: string
  description?: string | null
  media_urls?: string[]
  media_derivatives?: Record<string, any> | null
  thumbnail_url?: string | null
  user_id?: string
  artifact_type?: {
    id: string
    name: string
    icon_name: string
  } | null
}

interface ShowcaseCollection {
  id: string
  slug?: string
  title: string
  description?: string | null
  cover_image?: string | null
  user_id: string
  is_public?: boolean
  itemCount: number
  thumbnailImages?: string[]
}

interface HeroArtifact {
  id: string
  slug: string
  title: string
  description?: string | null
  media_urls?: string[]
  media_derivatives?: Record<string, any> | null
  thumbnail_url?: string | null
  user_id?: string
  artifact_type?: {
    id: string
    name: string
    icon_name: string
  } | null
}

interface LoggedOutHomepageProps {
  backgroundImages: string[]
  heroArtifacts: HeroArtifact[]
  showcaseArtifacts: ShowcaseArtifact[]
  showcaseCollections: ShowcaseCollection[]
}

const howItWorksSteps = [
  {
    icon: Upload,
    step: 1,
    title: "Create an Artifact",
    description: "Add photos, videos, or audio recordings of the things you treasure. Capture every detail.",
  },
  {
    icon: BookOpen,
    step: 2,
    title: "Add Story & Details",
    description: "Document the history, origin, and memories associated with each piece. Let AI help with descriptions.",
  },
  {
    icon: FolderOpen,
    step: 3,
    title: "Organize & Share",
    description: "Group artifacts into collections. Keep them private or share with family and friends.",
  },
]

function HowItWorksCarousel() {
  const [activeIndex, setActiveIndex] = useState(0)
  const totalSteps = howItWorksSteps.length

  const handlePrev = () => {
    if (activeIndex > 0) {
      setActiveIndex(activeIndex - 1)
    }
  }

  const handleNext = () => {
    if (activeIndex < totalSteps - 1) {
      setActiveIndex(activeIndex + 1)
    }
  }

  return (
    <section id="how-it-works" className="py-16 md:py-24 bg-muted/30">
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">How It Works</h2>
          <p className="text-muted-foreground text-lg">Three simple steps to preserve what matters</p>
        </div>
      </div>

      {/* Carousel container */}
      <div className="max-w-5xl mx-auto px-4">
        {/* Cards area with navigation buttons - relative wrapper for button positioning */}
        <div className="relative">
          {/* Left arrow - overlaid on card */}
          <button
            onClick={handlePrev}
            disabled={activeIndex === 0}
            className={cn(
              "absolute left-2 md:left-6 top-1/2 -translate-y-1/2 z-10",
              "flex h-10 w-10 items-center justify-center rounded-full",
              "bg-background/90 backdrop-blur-sm border shadow-md",
              "transition-all hover:bg-background hover:scale-105",
              activeIndex === 0 ? "opacity-0 pointer-events-none" : "opacity-100"
            )}
            aria-label="Previous step"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          {/* Right arrow - overlaid on card */}
          <button
            onClick={handleNext}
            disabled={activeIndex === totalSteps - 1}
            className={cn(
              "absolute right-2 md:right-6 top-1/2 -translate-y-1/2 z-10",
              "flex h-10 w-10 items-center justify-center rounded-full",
              "bg-background/90 backdrop-blur-sm border shadow-md",
              "transition-all hover:bg-background hover:scale-105",
              activeIndex === totalSteps - 1 ? "opacity-0 pointer-events-none" : "opacity-100"
            )}
            aria-label="Next step"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          {/* Sliding cards */}
          <div className="overflow-hidden">
            <div
              className="flex transition-transform duration-300 ease-out"
              style={{ transform: `translateX(-${activeIndex * 100}%)` }}
            >
              {howItWorksSteps.map((step) => (
                <div key={step.step} className="flex-shrink-0 w-full px-2 md:px-8">
                  <Card className="mx-auto max-w-[400px]">
                    <CardContent className="p-6 text-center space-y-4">
                      <div className="flex justify-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <step.icon className="h-7 w-7" />
                        </div>
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                          {step.step}
                        </span>
                        <h3 className="text-xl font-semibold">{step.title}</h3>
                      </div>
                      <p className="text-muted-foreground text-sm">{step.description}</p>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Dot indicators - outside relative wrapper */}
        <div className="flex justify-center gap-2 mt-6">
          {howItWorksSteps.map((_, index) => (
            <button
              key={index}
              onClick={() => setActiveIndex(index)}
              className={cn(
                "h-2 rounded-full transition-all",
                activeIndex === index
                  ? "w-6 bg-primary"
                  : "w-2 bg-primary/30 hover:bg-primary/50"
              )}
              aria-label={`Go to step ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

export function LoggedOutHomepage({
  backgroundImages,
  heroArtifacts,
  showcaseArtifacts,
  showcaseCollections,
}: LoggedOutHomepageProps) {
  const scrollToHowItWorks = () => {
    document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <div className="min-h-[100dvh] bg-background pb-20 lg:pb-0">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background" />

        {/* Floating background images */}
        <div className="absolute inset-0 overflow-hidden opacity-20">
          {backgroundImages[0] && (
            <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full overflow-hidden blur-sm">
              <MediaImage src={backgroundImages[0]} alt="" className="w-full h-full" objectFit="cover" />
            </div>
          )}
          {backgroundImages[1] && (
            <div className="absolute top-1/2 -left-20 w-48 h-48 rounded-full overflow-hidden blur-sm">
              <MediaImage src={backgroundImages[1]} alt="" className="w-full h-full" objectFit="cover" />
            </div>
          )}
        </div>

        <div className="relative px-4 py-16 md:py-24 lg:py-32">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            {/* Logo with Brand Name */}
            <div className="flex justify-center items-center gap-3 mb-8">
              <div className="flex h-16 w-16 items-center justify-center bg-gradient-to-br from-primary to-chart-2 text-primary-foreground shadow-lg rounded-lg">
                <svg
                  width="36"
                  height="40"
                  viewBox="0 0 80 90"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="shrink-0"
                >
                  <path d="M39.6001 90L52.1001 82.7L39.6001 75.5L27.1001 82.7L39.6001 90Z" fill="currentColor" />
                  <path d="M2.0001 68.3L14.6001 75.5L27.1001 68.3L14.6001 61L2.0001 68.3Z" fill="currentColor" />
                  <path d="M77.2002 68.3L64.6002 61L52.1002 68.3L64.6002 75.5L77.2002 68.3Z" fill="currentColor" />
                  <path d="M39.6001 61L52.1001 53.8L39.6001 46.6L27.1001 53.8L39.6001 61Z" fill="currentColor" />
                  <path d="M39.6001 75.5L52.1001 68.3L39.6001 61L27.1001 68.3L39.6001 75.5Z" fill="currentColor" />
                  <path d="M37.6001 43.3L37.6001 28.9L25.1001 36.1L25.1001 50.5L37.6001 43.3Z" fill="currentColor" />
                  <path d="M12.6001 43.3L0.0001 50.5L0 65L12.6001 57.8L12.6001 43.3Z" fill="currentColor" />
                  <path d="M37.6001 0L25.1001 7.2L25.1001 21.6L37.6001 14.4L37.6001 0Z" fill="currentColor" />
                  <path d="M0 21.6L0 36.1L12.6001 28.9L12.6001 14.4L0 21.6Z" fill="currentColor" />
                  <path d="M25.1001 21.6L12.6001 28.9L12.6001 43.3L25.1001 36.1L25.1001 21.6Z" fill="currentColor" />
                  <path d="M41.6001 43.3L54.1001 50.5L54.1001 36.1L41.6001 28.9L41.6001 43.3Z" fill="currentColor" />
                  <path d="M79.2002 65L79.2002 50.5L66.6002 43.3L66.6002 57.8L79.2002 65Z" fill="currentColor" />
                  <path d="M54.1001 7.2L41.6001 0L41.6001 14.4L54.1001 21.6L54.1001 7.2Z" fill="currentColor" />
                  <path d="M79.2002 21.6L66.6002 14.4L66.6002 28.9L79.2002 36.1L79.2002 21.6Z" fill="currentColor" />
                  <path d="M66.6001 43.3L66.6001 28.9L54.1001 21.6L54.1001 36.1L66.6001 43.3Z" fill="currentColor" />
                </svg>
              </div>
              <span className="text-3xl md:text-4xl font-bold tracking-tight">Heirlooms</span>
              <span className="text-sm font-normal text-muted-foreground">(Beta)</span>
            </div>

            {/* Headline */}
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
              Capture, organize, and share the things you love and the stories behind them.
            </h1>
          </div>

          {/* Hero Carousel - Full width, compact cards, infinite loop */}
          {heroArtifacts.length > 0 && (
            <div className="py-8">
              <ArtifactsCarousel artifacts={heroArtifacts} hideEmptyState compact infinite />
            </div>
          )}

          <div className="max-w-4xl mx-auto text-center space-y-6">
            {/* Subheading */}
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Create beautiful digital collections of your artifacts, preserve their stories, and share them with the people who matter most.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
              <Button size="lg" asChild className="gap-2 w-full sm:w-64">
                <Link href="/login?returnTo=/artifacts">
                  <Package className="h-4 w-4" />
                  Create Your First Artifact
                </Link>
              </Button>
              <Button size="lg" asChild className="gap-2 bg-purple-600 hover:bg-purple-700 w-full sm:w-64">
                <Link href="/login?returnTo=/collections">
                  <LayoutGrid className="h-4 w-4" />
                  Start Your First Collection
                </Link>
              </Button>
            </div>
            <div className="flex flex-col items-center gap-3 pt-2">
              <Button size="lg" variant="ghost" onClick={scrollToHowItWorks} className="gap-2 text-muted-foreground">
                See How It Works
                <ChevronDown className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                asChild
                className="rounded-full text-xs text-muted-foreground/60 border-muted-foreground/30 hover:text-muted-foreground hover:border-muted-foreground/50 hover:bg-transparent"
              >
                <Link href="/login?returnTo=/">
                  Login to continue
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <HowItWorksCarousel />

      {/* Community Showcase: Artifacts */}
      {showcaseArtifacts.length > 0 && (
        <CommunityShowcase
          artifacts={showcaseArtifacts}
          title="Community Showcase"
          subtitle="Artifacts"
          showViewAll
          viewAllHref="/artifacts"
          maxItems={9}
          className="bg-muted/30"
        />
      )}

      {/* Collections Preview */}
      {showcaseCollections.length > 0 && (
        <section className="px-4 py-12 md:py-16">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-end justify-between mb-6">
              <div className="flex items-end gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-0.5">
                  <LayoutGrid className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Community Showcase</p>
                  <h2 className="text-xl md:text-2xl font-bold tracking-tight leading-tight">Collections</h2>
                </div>
              </div>
              <Link
                href="/collections"
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors self-end mb-0.5"
              >
                View All
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {showcaseCollections.slice(0, 4).map((collection) => (
                <CollectionCard key={collection.id} collection={collection} mode="all" />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Value Props / For Whom Section */}
      <section className="px-4 py-16 md:py-24 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Built For</h2>
            <p className="text-muted-foreground text-lg">Whether you collect, create, or preserve memories</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Families */}
            <Card className="text-center p-6 hover:shadow-lg transition-shadow">
              <CardContent className="pt-0 space-y-4">
                <div className="flex justify-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Users className="h-6 w-6" />
                  </div>
                </div>
                <h3 className="font-semibold text-lg">Families</h3>
                <p className="text-sm text-muted-foreground">
                  Preserve heirlooms and family history for future generations.
                </p>
              </CardContent>
            </Card>

            {/* Collectors */}
            <Card className="text-center p-6 hover:shadow-lg transition-shadow">
              <CardContent className="pt-0 space-y-4">
                <div className="flex justify-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Sparkles className="h-6 w-6" />
                  </div>
                </div>
                <h3 className="font-semibold text-lg">Collectors</h3>
                <p className="text-sm text-muted-foreground">
                  Document watches, cars, art, or any collection with rich detail.
                </p>
              </CardContent>
            </Card>

            {/* Makers & Creators */}
            <Card className="text-center p-6 hover:shadow-lg transition-shadow">
              <CardContent className="pt-0 space-y-4">
                <div className="flex justify-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Palette className="h-6 w-6" />
                  </div>
                </div>
                <h3 className="font-semibold text-lg">Makers & Creators</h3>
                <p className="text-sm text-muted-foreground">
                  Showcase your creations with the stories behind each piece.
                </p>
              </CardContent>
            </Card>

            {/* Story Preservers */}
            <Card className="text-center p-6 hover:shadow-lg transition-shadow">
              <CardContent className="pt-0 space-y-4">
                <div className="flex justify-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Heart className="h-6 w-6" />
                  </div>
                </div>
                <h3 className="font-semibold text-lg">Story Preservers</h3>
                <p className="text-sm text-muted-foreground">
                  Anyone who wants to keep memories alive and share them.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="px-4 py-12 md:py-16">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-muted-foreground text-lg italic">
            Made by people who care about design, storytelling, and legacy.
          </p>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="px-4 py-16 md:py-24 bg-gradient-to-b from-background to-primary/5">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Ready to preserve what matters?
          </h2>
          <p className="text-muted-foreground text-lg">
            Start your collection today. It only takes a minute.
          </p>
          <Button size="lg" asChild className="gap-2">
            <Link href="/login?returnTo=/">
              Get Started Free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 py-8 border-t">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center bg-gradient-to-br from-primary to-chart-2 text-primary-foreground rounded-sm">
              <svg
                width="16"
                height="18"
                viewBox="0 0 80 90"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M39.6001 90L52.1001 82.7L39.6001 75.5L27.1001 82.7L39.6001 90Z" fill="currentColor" />
                <path d="M2.0001 68.3L14.6001 75.5L27.1001 68.3L14.6001 61L2.0001 68.3Z" fill="currentColor" />
                <path d="M77.2002 68.3L64.6002 61L52.1002 68.3L64.6002 75.5L77.2002 68.3Z" fill="currentColor" />
                <path d="M39.6001 61L52.1001 53.8L39.6001 46.6L27.1001 53.8L39.6001 61Z" fill="currentColor" />
                <path d="M39.6001 75.5L52.1001 68.3L39.6001 61L27.1001 68.3L39.6001 75.5Z" fill="currentColor" />
                <path d="M37.6001 43.3L37.6001 28.9L25.1001 36.1L25.1001 50.5L37.6001 43.3Z" fill="currentColor" />
                <path d="M12.6001 43.3L0.0001 50.5L0 65L12.6001 57.8L12.6001 43.3Z" fill="currentColor" />
                <path d="M37.6001 0L25.1001 7.2L25.1001 21.6L37.6001 14.4L37.6001 0Z" fill="currentColor" />
                <path d="M0 21.6L0 36.1L12.6001 28.9L12.6001 14.4L0 21.6Z" fill="currentColor" />
                <path d="M25.1001 21.6L12.6001 28.9L12.6001 43.3L25.1001 36.1L25.1001 21.6Z" fill="currentColor" />
                <path d="M41.6001 43.3L54.1001 50.5L54.1001 36.1L41.6001 28.9L41.6001 43.3Z" fill="currentColor" />
                <path d="M79.2002 65L79.2002 50.5L66.6002 43.3L66.6002 57.8L79.2002 65Z" fill="currentColor" />
                <path d="M54.1001 7.2L41.6001 0L41.6001 14.4L54.1001 21.6L54.1001 7.2Z" fill="currentColor" />
                <path d="M79.2002 21.6L66.6002 14.4L66.6002 28.9L79.2002 36.1L79.2002 21.6Z" fill="currentColor" />
                <path d="M66.6001 43.3L66.6001 28.9L54.1001 21.6L54.1001 36.1L66.6001 43.3Z" fill="currentColor" />
              </svg>
            </div>
            <span className="font-semibold">Heirlooms</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Built with care for preserving what matters.
          </p>
        </div>
      </footer>
      {/* Bottom Navigation for Mobile */}
      <BottomNav />
    </div>
  )
}
