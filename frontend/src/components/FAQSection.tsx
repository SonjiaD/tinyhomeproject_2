import { useState } from 'react'
import { useParkingCount } from '../lib/useParkingCount'

interface FAQItem {
  question: string
  answer: React.ReactNode
}

const faqItems: FAQItem[] = [
  {
    question: 'What exactly is Tiny Home Parklet?',
    answer: (
      <>
        <p className="mb-3">
          A factory-built home, usually around 200 square feet, with a full kitchen, bathroom, and
          electrical hookup. Park Models is the legal term, they are built to California HCD Title 25
          standards and ANSI 119.5. They're technically transportable structures on a chassis, which
          means they don't require a foundation. These are not sleeping cabins or shelter beds. They
          are full residential units, studio apartments on wheels. The Parklet part is a small fenced
          enclosure around the home.
        </p>
        <p>
          This is an antidote to the lawless street parking of RVs happening now because there is
          not an adequate supply of financially accessible housing. Expanding supply would
          ultimately bring rents down across the city, which would significantly reduce the demand
          and need for someone to park an RV to live on the street, and provide an opportunity for
          reasonable enforcement of non-permitted homes on wheels.
        </p>
      </>
    ),
  },
  {
    question: 'Is this for homeless people?',
    answer: (
      <p>
        No. These are market-rate rental units, built and owned by the adjacent property owner,
        rented like any other apartment. Adding 6,000 to 30,000 new market-rate rentals to
        Oakland's housing stock relieves price pressure across the entire market, which over time
        helps everyone, including people at risk of becoming homeless. But the units themselves are
        just housing, for anyone who wants to rent one. Coincidentally, 6,000 is more than the most
        recently published point-in-time homeless count in 2024.
      </p>
    ),
  },
  {
    question: 'Who builds and owns each unit?',
    answer: (
      <>
        <p className="mb-3">
          The property owner whose lot sits across the sidewalk from the parking space. They invest
          the ~$100,000 to install and connect the unit, and they collect the rent, same legal and
          financial structure as building an ADU in your backyard, just on the parking strip out
          front. The city's role is to permit the use, set the standards, and collect the tax
          revenue. This is probably the most straightforward approach, but other options could be:
        </p>
        <ul className="space-y-1 text-sm">
          <li className="flex items-start gap-2">
            <span className="text-primary-500 mt-0.5 shrink-0">-</span>
            City-owned and rented
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary-500 mt-0.5 shrink-0">-</span>
            Private developer with a city concession
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary-500 mt-0.5 shrink-0">-</span>
            Individual occupant who owns the home and pays a "lot lease" to the city (the
            mobilehome/RV park model)
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary-500 mt-0.5 shrink-0">-</span>
            Or maybe you have another idea?
          </li>
        </ul>
      </>
    ),
  },
  {
    question: 'What does it cost to build one?',
    answer: (
      <p>
        Roughly $80,000 for the factory-built unit, plus ~$20,000 for site prep and utility
        hookup. Total: ~$100,000 per finished, occupiable home. Compare that to the
        $150,000–$300,000 median for a California ADU or $600,000–$1,000,000+ for a Bay Area
        apartment unit.
      </p>
    ),
  },
  {
    question: 'How fast can these be installed?',
    answer: (
      <p>
        6–10 weeks per unit, start to finish. The entire 6,000-unit deployment could be completed
        faster than the permit review on a single conventional apartment building. There is no other
        intervention available to Oakland that delivers occupiable housing this fast.
      </p>
    ),
  },
  {
    question: 'How does the city make money on this?',
    answer: (
      <>
        <p className="mb-3">
          Two recurring revenues per unit: the Business License Tax on rental income (Oakland's
          standard 1.395% of gross rents) and the Rent Adjustment Program fee ($101 per unit
          annually). At $1,000/month rent:
        </p>
        <ul className="space-y-2 text-sm mb-3">
          <li className="flex items-start gap-2">
            <span className="text-primary-500 mt-0.5 shrink-0">-</span>
            <span>
              <span className="font-medium">6,000 units:</span> ~$1.6 million/year in new municipal
              revenue ($72M gross rents × 1.395% = $1,004,400 BLT; 6,000 × $101 = $606,000 RAP fees)
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary-500 mt-0.5 shrink-0">-</span>
            <span>
              <span className="font-medium">18,000 units:</span> ~$4.8 million/year
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary-500 mt-0.5 shrink-0">-</span>
            <span>
              <span className="font-medium">30,000 units:</span> ~$8.1 million/year
            </span>
          </li>
        </ul>
        <p>All funded by housing that didn't exist before, on land the city already owns.</p>
      </>
    ),
  },
  {
    question: 'What happens to parking?',
    answer: (
      <>
        <p className="mb-3">
          On-street parking is a small fraction of total parking in Oakland. The vast majority sits
          in private driveways, garages, surface lots, and structures, and most cars in Oakland don't
          sleep on the street. Research by parking economists has consistently found this pattern
          across U.S. cities. If we wanted to compensate further, a portion of the new tax revenue
          could fund neighborhood-permit-only structured parking, paid for by the new housing the
          spaces became.
        </p>
        <p>
          Parking demand is already starting to fall. Autonomous ride-hailing services like Waymo
          are now operating commercially in San Francisco, Phoenix, Los Angeles, and a growing list
          of cities: every ride in a self-driving vehicle is a ride that doesn't require a parked
          car at either end. Peer-reviewed studies project urban parking demand will drop at least
          20% in dense areas by 2030 as autonomous mobility scales, with reductions reaching
          80–90% as shared AV adoption matures. Even in conservative scenarios where most AVs
          remain privately owned, researchers project 25–32% of city center parking will be freed
          up, simply because self-driving cars can drop passengers off and drive themselves home.
          Oakland's surplus parking is already a wasting asset on a one-way trajectory. Converting
          some of it to housing now means getting ahead of a transition that's already underway.
        </p>
      </>
    ),
  },
  {
    question: 'Why these specific numbers: 6,000, 18,000, 30,000?',
    answer: (
      <p>
        California's state-mandated housing target for Oakland is 26,251 units by 2031, of which
        Oakland has permitted 3,614. 6,000 units is a meaningful demonstration and just higher than
        the most recent point in time count of homeless on the streets. 18,000 closes the projected
        shortfall. 30,000 pushes Oakland's rental vacancy rate from ~4% to a healthy 6–7%, the
        level at which Austin and Minneapolis, both of which sustained heavy construction over the
        last five years, saw their real rents begin to fall.
      </p>
    ),
  },
  {
    question: 'How did you get to __COUNT__ parking spaces?',
    answer: '__PARKING_ANSWER__',
  },
  {
    question: 'Is this even legal?',
    answer: (
      <p>
        Not yet. That's the point of this campaign. The pieces all exist: California has codes for
        the unit (HCD Title 25 park trailer standards), codes for clustered residential utility
        hookups (Special Occupancy Park standards), Oakland allows this model of housing on private
        property under the VRF ordinance and Oakland has a parklet permit program for restaurants.
        What's missing is the ordinance that combines them for residential use on the public
        right-of-way. Building consensus on where people want this to happen is step one toward
        making that ordinance possible. That's where your use of this tool comes in.
      </p>
    ),
  },
]

function FAQItem({ question, answer }: FAQItem) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left hover:bg-surface-muted transition-colors"
        aria-expanded={open}
      >
        <span className="font-medium text-gray-800">{question}</span>
        <svg
          className={`shrink-0 w-5 h-5 text-primary-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-6 py-5 text-gray-600 leading-relaxed text-sm">
          {answer}
        </div>
      )}
    </div>
  )
}

export function FAQSection() {
  const parkingCount = useParkingCount()
  const displayCount = parkingCount.toLocaleString()

  const items = faqItems.map(item => {
    if (!item.question.includes('__COUNT__')) return item
    return {
      question: item.question.replace('__COUNT__', displayCount),
      answer: (
        <p>
          Each rectangle represents one 30 ft × 10 ft tiny home parking spot, oriented parallel
          to its street. Spots are packed along every eligible block with a 20 ft clearance at
          each end (California Daylighting Law, AB 413). The {displayCount} total comes from six
          City of Oakland Open Data layers (on-street inventory, permit zones, parking meters,
          Jack London and International Blvd curb inventories, and off-street facilities),
          supplemented by SpotAngels, OpenStreetMap, and SpotHero data, then filtered to remove
          spots more than 10,000 meters from essential services.
        </p>
      ),
    }
  })

  return (
    <section>
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Frequently Asked Questions</h2>
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        {items.map((item) => (
          <FAQItem key={item.question} question={item.question} answer={item.answer} />
        ))}
      </div>
    </section>
  )
}
