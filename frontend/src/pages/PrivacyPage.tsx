import { Footer } from '../components/Footer'
import { Card, SectionLabel, PageLayout } from '../components/ui'

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Card padding="lg">
      <SectionLabel className="mb-3">{label}</SectionLabel>
      {children}
    </Card>
  )
}

/**
 * Privacy policy.
 *
 * Required by Google before an OAuth consent screen can be published, but needed regardless:
 * onboarding asks for income range, age range, household type, occupation and neighbourhood,
 * which is real personal data collected for research.
 *
 * Written to describe what this app actually does rather than as boilerplate. If the data
 * collected changes, this page has to change with it.
 */
export default function PrivacyPage() {
  return (
    <div className="flex flex-col min-h-screen bg-surface-page">
      <div className="bg-primary-900 px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <SectionLabel className="text-teal-400 mb-3">Oakland, California</SectionLabel>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Privacy Policy</h1>
          <p className="text-teal-300 leading-relaxed max-w-2xl">
            What this tool collects, why it collects it, and how to have it removed.
          </p>
        </div>
      </div>

      <PageLayout maxWidth="lg" className="flex-1">
        <div className="space-y-6">
        <Section label="Who runs this">
          <p className="text-gray-600 leading-relaxed">
            This tool is operated by the <strong>Kalyan Lab</strong> at the{' '}
            <strong>University of British Columbia</strong>, in collaboration with Adam
            Garrett-Clark (Tiny Logic, founder of Neighborship). It exists to gather community
            input on where tiny home parklets could go in Oakland.
          </p>
        </Section>

        <Section label="What we collect">
          <p className="text-gray-600 leading-relaxed mb-4">
            When you sign in with Google, we receive your <strong>name</strong> and{' '}
            <strong>email address</strong>. We do not receive your Google password, contacts,
            or anything else from your Google account.
          </p>
          <p className="text-gray-600 leading-relaxed mb-3">
            During onboarding you may also be asked for the following. All of it is optional
            except your housing goal, and you can skip or change any of it later from your
            profile page:
          </p>
          <ul className="space-y-2 text-sm text-gray-600 mb-4">
            {[
              'Your neighbourhood in Oakland',
              'Your occupation',
              'Age range and household type',
              'Income range',
              'Your relationship to housing in Oakland (renter, owner, advocate, and so on)',
              'Which ownership model you would prefer for tiny home parklets',
            ].map(item => (
              <li key={item} className="flex items-start gap-2">
                <span className="text-teal-500 mt-0.5 shrink-0">&ndash;</span>
                {item}
              </li>
            ))}
          </ul>
          <p className="text-gray-600 leading-relaxed">
            We also record <strong>which parking spots you vote on</strong>, whether you
            supported or opposed each one, any note you attach, and the history of changes to
            those votes. If you submit a suggested location, we store its coordinates and
            whatever you write about it.
          </p>
        </Section>

        <Section label="Why we collect it">
          <p className="text-gray-600 leading-relaxed">
            The votes are the point of the tool: where enough people converge is the evidence
            that supports a policy case. The optional demographic questions let researchers
            understand <em>who</em> is being represented in that evidence, so the results can be
            reported honestly rather than presented as if they speak for everyone in Oakland.
          </p>
        </Section>

        <Section label="Who can see it">
          <p className="text-gray-600 leading-relaxed mb-4">
            <strong>Vote totals are public.</strong> Anyone using the map can see how many
            people supported or opposed a given spot. Those totals are aggregate counts only:
            they do not reveal who voted, and your name and email are never attached to them.
          </p>
          <p className="text-gray-600 leading-relaxed mb-4">
            <strong>Your individual votes, notes and profile answers are private.</strong> The
            database enforces this directly: you can only read and change your own rows. Other
            signed-in users cannot query them.
          </p>
          <p className="text-gray-600 leading-relaxed">
            Researchers on the project can access the full dataset for analysis. Anything
            published or presented uses aggregate or de-identified data, not individual records
            tied to a name.
          </p>
        </Section>

        <Section label="Where it is stored">
          <p className="text-gray-600 leading-relaxed">
            Data is stored with <strong>Supabase</strong>, on servers in the United States.
            Sign-in is handled by <strong>Google</strong>. The site itself is hosted by{' '}
            <strong>Netlify</strong>. We do not use advertising trackers, and we do not sell or
            share your data with anyone outside the project.
          </p>
        </Section>

        <Section label="Getting your data, or having it deleted">
          <p className="text-gray-600 leading-relaxed">
            Contact the <strong>Kalyan Lab</strong> at the University of British Columbia and
            ask. You can request a copy of everything associated with your account, or ask for
            it to be deleted. Deletion
            removes your account, profile answers, votes and suggestions. Aggregate counts that
            have already been published cannot be retroactively separated back out, but nothing
            identifying you remains.
          </p>
        </Section>

        <Section label="Changes to this policy">
          <p className="text-gray-600 leading-relaxed">
            If what we collect changes, this page changes with it. Because the tool is an
            active research project, it is worth re-reading if you return after a long gap.
          </p>
        </Section>
        </div>
      </PageLayout>

      <Footer />
    </div>
  )
}
