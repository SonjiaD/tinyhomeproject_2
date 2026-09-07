import { Footer } from '../components/Footer'
import { FAQSection } from '../components/FAQSection'
import { Card, SectionLabel } from '../components/ui'

function AboutSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Card padding="lg">
      <SectionLabel className="mb-3">{label}</SectionLabel>
      {children}
    </Card>
  )
}

export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen bg-surface-page">
      {/* Page hero */}
      <div className="bg-primary-900 px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <SectionLabel className="text-teal-400 mb-3">Oakland, California</SectionLabel>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">About This Project</h1>
          <p className="text-teal-300 leading-relaxed max-w-2xl">
            A research-backed tool for community-driven tiny home site selection in Oakland, California.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12 space-y-6 w-full flex-1">
        <AboutSection label="The Problem">
          <p className="text-gray-600 leading-relaxed">
            California requires Oakland to permit 26,251 new housing units by 2031. So far, roughly
            3,614 have been approved, a gap of more than 22,000 homes. Meanwhile, Oakland has tens
            of thousands of on-street parking spaces sitting mostly idle. Tiny Home Parklets convert
            individual parking spots into full, market-rate residential units: factory-built, 200 sq ft,
            installed in 6–10 weeks for around $100,000 each, on land the city already controls.
          </p>
        </AboutSection>

        <AboutSection label="What Is a Tiny Home Parklet?">
          <p className="text-gray-600 leading-relaxed mb-4">
            Permitted factory-built Park Models (also known as Tiny Homes on Wheels): fully
            code-compliant homes with kitchens and bathrooms, installed legally through an
            approval process on Oakland parking spaces, connected to utilities, and rented or
            owned by everyday people.
          </p>
          <p className="text-gray-600 leading-relaxed mb-4">
            This is an antidote to the lawless street parking of RVs happening now because there
            is not an adequate supply of financially accessible housing. Expanding supply would
            ultimately bring rents down across the city, which would significantly reduce the
            demand and need for someone to park an RV to live on the street, and provide an
            opportunity for reasonable enforcement of non-permitted homes on wheels.
          </p>
          <div className="rounded-xl overflow-hidden border border-gray-100">
            <img
              src="/tinyHomeParklet.webp"
              alt="A tiny yellow home with a white picket fence on an Oakland street"
              className="w-full"
              loading="eager"
              // Lowercase on purpose: React 18 does not know the camelCase fetchPriority prop
              // and logs an "unrecognized prop" error, then drops it. Lowercase passes straight
              // through to the DOM, so the hint actually reaches the browser.
              {...{ fetchpriority: 'high' }}
            />
          </div>
          <p className="mt-2 text-xs text-gray-400">
            Concept rendering of a Tiny Home Parklet for Oakland.
          </p>
        </AboutSection>

        <AboutSection label="Data Sources">
          <p className="text-gray-600 leading-relaxed mb-3">
            The parking inventory is built from six primary datasets from the City of Oakland Open
            Data portal, supplemented by crowdsourced and scraped sources:
          </p>
          <ul className="space-y-2 text-sm text-gray-600 mb-4">
            {[
              'Residential Parking Permit Zones: polygon zones for blocks requiring residential permits',
              'On-Street Parking Inventory: curb segments with regulations (meters, time limits)',
              'Off-Street Parking Facilities: public pay and permit garages and lots',
              'Parking Meters: all city-managed IPS parking meters',
              'Jack London On-Street Parking: curb availability for the Jack London district',
              'International Blvd BRT Parking: curb inventory near the International Blvd corridor',
            ].map(item => (
              <li key={item} className="flex items-start gap-2">
                <span className="text-teal-500 mt-0.5 shrink-0">&ndash;</span>
                {item}
              </li>
            ))}
          </ul>
          <p className="text-gray-600 leading-relaxed mb-3">Supplemental sources:</p>
          <ul className="space-y-2 text-sm text-gray-600">
            {[
              'SpotAngels: scraped real-time parking rules to identify overnight-free and holiday parking',
              'OpenStreetMap via Overpass Turbo: East Oakland parking lanes and streetside parking nodes',
              'SpotHero: supplemental parking inventory',
            ].map(item => (
              <li key={item} className="flex items-start gap-2">
                <span className="text-teal-500 mt-0.5 shrink-0">&ndash;</span>
                {item}
              </li>
            ))}
          </ul>
        </AboutSection>

        <AboutSection label="The Team">
          <p className="text-gray-600 leading-relaxed">
            This tool was developed by the <strong>Kalyan Lab</strong> at the{' '}
            <strong>University of British Columbia (UBC)</strong>, focusing on urban
            analytics, GIS, and equitable urban planning. Our goal is to make complex spatial
            decision-making accessible to community members and planners alike.
          </p>
          <p className="text-gray-600 leading-relaxed mt-3">
            In collaboration with <strong>Adam Garrett-Clark</strong> (Tiny Logic, founder of{' '}
            <strong>Neighborship</strong>), who shaped the tiny home parklet concept and campaign.
          </p>
        </AboutSection>

        <AboutSection label="Get Involved">
          <p className="text-gray-600 leading-relaxed">
            Vote on the map to show which parking spots you'd support converting to tiny homes.
            Share the tool with neighbors and community members. The more Oaklanders who weigh in,
            the stronger the case for making this a reality.
          </p>
        </AboutSection>

        <FAQSection />
      </div>

      <Footer />
    </div>
  )
}
