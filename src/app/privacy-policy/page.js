import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | TrendPilot",
  description:
    "Learn how TrendPilot collects, uses, stores and protects personal information when you use our website and services.",
  alternates: {
    canonical: "/privacy-policy",
  },
  openGraph: {
    title: "Privacy Policy | TrendPilot",
    description:
      "Understand how TrendPilot handles your personal information and privacy.",
    url: "/privacy-policy",
    type: "website",
  },
};

const sections = [
  {
    title: "1. Who We Are",
    content: (
      <>
        <p>
          TrendPilot is an online publication and digital platform that provides
          articles, insights and community features. It is operated by an
          individual based in Nigeria.
        </p>
        <p>
          For the purposes of applicable data protection laws, the individual
          operating TrendPilot is responsible for personal information processed
          through this website.
        </p>
      </>
    ),
  },
  {
    title: "2. Personal Information We Collect",
    content: (
      <>
        <p>Depending on how you use TrendPilot, we may collect:</p>
        <ul>
          <li>
            <strong>Account information:</strong> your display name, email
            address and account details when you register or manage an account.
          </li>
          <li>
            <strong>Authentication information:</strong> credentials and
            authentication data processed securely through our authentication
            provider. We do not intentionally store your password in readable,
            plain-text form.
          </li>
          <li>
            <strong>Comments and community information:</strong> comments,
            replies and related account information that you submit on articles.
          </li>
          <li>
            <strong>Contact information:</strong> your name, email address,
            subject and message when you contact us through our contact form.
          </li>
          <li>
            <strong>Newsletter information:</strong> your email address,
            optional name, subscription status and records of your consent,
            confirmation or withdrawal of consent.
          </li>
          <li>
            <strong>Security information:</strong> limited technical and
            abuse-prevention information used to protect the website and prevent
            misuse, including privacy-preserving signup fingerprints.
          </li>
          <li>
            <strong>Analytics information:</strong> when you allow optional
            analytics, Google Analytics 4 may process information such as pages
            viewed, page paths, page titles, browsing interactions, browser and
            device information, and related online identifiers.
          </li>
          <li>
            <strong>Advertising information:</strong> when you interact with
            advertisements, we may record the relevant campaign and placement
            identifiers and the date of the click for advertising performance
            measurement.
          </li>
          <li>
            <strong>Affiliate click information:</strong> when you follow an
            affiliate link, we may record a click identifier, the relevant
            affiliate link and article identifiers, the referring website host,
            browser family and click timestamp.
          </li>
          <li>
            <strong>Affiliate conversion and commission information:</strong>
            where an affiliate partner or verified source provides it, we may
            receive transaction references, conversion values, currencies,
            conversion statuses and related commission records.
          </li>
        </ul>
        <p>
          Affiliate and advertising click records are used for measurement and
          reporting. A recorded click does not by itself establish that a
          purchase or other conversion occurred.
        </p>
        <p>
          Please avoid including sensitive personal information in public
          comments or messages unless it is necessary for your enquiry.
        </p>
      </>
    ),
  },
  {
    title: "3. How We Use Your Information",
    content: (
      <>
        <p>We use personal information for purposes such as:</p>
        <ul>
          <li>Creating and maintaining user accounts.</li>
          <li>Providing access to articles and community features.</li>
          <li>Displaying and managing comments and replies.</li>
          <li>Responding to enquiries and support requests.</li>
          <li>Sending newsletter emails where you have chosen to subscribe.</li>
          <li>
            Maintaining website security and preventing spam, fraud and
            unauthorized activity.
          </li>
          <li>
            Understanding website usage and improving our content and services
            through analytics where you have granted the required consent.
          </li>
          <li>
            Managing advertising campaigns, recording advertisement clicks and
            measuring advertising placement performance.
          </li>
          <li>
            Managing affiliate links and measuring affiliate clicks, verified
            conversions and related commission records where that information is
            available.
          </li>
          <li>Operating, maintaining and improving the platform.</li>
          <li>Meeting applicable legal obligations.</li>
        </ul>
      </>
    ),
  },
  {
    title: "4. Legal Basis for Processing",
    content: (
      <>
        <p>
          Where applicable under the Nigeria Data Protection Act 2023 and other
          relevant data protection laws, we process personal information on one
          or more of the following grounds:
        </p>
        <ul>
          <li>
            <strong>Consent:</strong> where you voluntarily subscribe to
            newsletters or accept optional analytics. You may withdraw consent
            at any time, without affecting processing that took place before
            withdrawal.
          </li>
          <li>
            <strong>Contract or requested services:</strong> where processing is
            necessary to provide an account or a feature you request.
          </li>
          <li>
            <strong>Legitimate interests:</strong> where reasonably necessary to
            secure, maintain and improve the website, measure operational
            performance or prevent misuse, provided those interests do not
            override your applicable rights and freedoms.
          </li>
          <li>
            <strong>Legal obligations:</strong> where processing is required by
            applicable law.
          </li>
        </ul>
        <p>
          The appropriate legal basis depends on the particular processing
          activity. We do not rely on analytics consent as authorization for
          unrelated processing, and rejecting optional analytics does not
          prevent essential website functions from operating.
        </p>
      </>
    ),
  },
  {
    title: "5. Newsletter and Email Communications",
    content: (
      <>
        <p>
          If you subscribe to the TrendPilot newsletter, we collect your email
          address and any optional name you provide. We use this information to
          manage your subscription and send newsletter-related communications.
        </p>
        <p>
          Subscription requires your consent and email confirmation. You can
          withdraw your consent at any time using the unsubscribe link or
          instructions provided in a relevant email.
        </p>
        <p>
          We may retain a limited suppression record after you unsubscribe so
          that we can respect your decision and avoid sending further newsletter
          emails to that address.
        </p>
      </>
    ),
  },
  {
    title: "6. Cookies and Similar Technologies",
    content: (
      <>
        <p>
          TrendPilot uses essential browser storage and session technologies to
          support account authentication, maintain secure sessions and operate
          website features. For example, our authentication provider may use
          cookies to keep you signed in.
        </p>
        <p>
          We also use an analytics preference cookie named
          <strong> trendpilot_analytics_consent</strong> to remember whether you
          have accepted or rejected optional analytics. This preference is
          retained for up to 180 days. You can change your choice using the
          Privacy settings control displayed on the public website.
        </p>
        <p>
          If you accept analytics and a valid Google Analytics 4 Measurement ID
          has been configured, TrendPilot loads Google Analytics 4 to measure
          website visits and page views, including navigation between pages.
          Google Analytics is not loaded through this implementation before
          analytics consent is granted. Withdrawing consent updates the
          analytics consent state to denied.
        </p>
        <p>
          Google Analytics may use cookies and similar technologies to
          distinguish visitors and understand website usage. Information
          processed through this service may include online identifiers,
          browsing activity, page information and technical information about
          your browser or device. Google&apos;s processing is also subject to
          Google&apos;s own privacy terms.
        </p>
        <p>
          Our internal dashboard analytics are separate from Google Analytics.
          You can also manage cookies through your browser settings. Disabling
          essential cookies may affect sign-in and some website features.
        </p>
      </>
    ),
  },
  {
    title: "7. Service Providers and Sharing",
    content: (
      <>
        <p>
          We use trusted service providers to operate TrendPilot. These may
          process personal information on our behalf for specific services,
          including:
        </p>
        <ul>
          <li>
            <strong>Supabase:</strong> authentication, database and related
            application infrastructure.
          </li>
          <li>
            <strong>Resend:</strong> delivery of transactional and
            newsletter-related emails.
          </li>
          <li>
            <strong>Website hosting providers:</strong> hosting and delivering
            the website and its application services.
          </li>
          <li>
            <strong>Google:</strong> Google Analytics 4 may process website
            usage information when analytics is enabled and you have granted
            analytics consent.
          </li>
        </ul>
        <p>
          TrendPilot may display advertisements supplied or managed directly
          through its advertising platform. We record certain advertising
          activity, such as clicks, to measure campaign performance. The
          advertising click-recording process described here records campaign
          and placement information; it is not itself a record of a purchase.
        </p>
        <p>
          Some articles may contain affiliate links. When you follow an
          affiliate link, you visit an external merchant or affiliate
          destination. That external party may collect information about your
          visit, device or subsequent transaction under its own privacy policy.
          We may receive click, conversion and commission information from an
          affiliate partner or other verified source when such information is
          made available to us.
        </p>
        <p>
          We do not sell your personal information. We may disclose information
          where necessary to provide a requested service, protect the website,
          comply with legal obligations or respond to lawful requests.
        </p>
        <p>
          Service providers and external destinations may process information in
          countries other than Nigeria. Where applicable, we will take steps
          required by data protection law in relation to international
          transfers.
        </p>
      </>
    ),
  },
  {
    title: "8. Data Retention",
    content: (
      <>
        <p>
          We retain personal information only for as long as reasonably
          necessary for the purposes described in this policy, including
          providing services, maintaining security and meeting legal
          obligations.
        </p>
        <ul>
          <li>
            Account information is generally retained while your account remains
            active and as necessary afterward for legitimate or legal purposes.
          </li>
          <li>
            Comments may remain visible with their associated articles unless
            removed by you where available or moderated in accordance with
            platform rules.
          </li>
          <li>
            Newsletter information is retained while your subscription is active
            and may be retained in limited form after withdrawal to maintain
            suppression records.
          </li>
          <li>
            Contact and security information is retained only as reasonably
            necessary for its relevant purpose.
          </li>
          <li>
            Advertising and affiliate click records may be retained for campaign
            measurement, performance reporting, fraud prevention and related
            operational purposes for as long as reasonably necessary.
          </li>
          <li>
            Affiliate conversion and commission records may be retained for
            reconciliation, reporting, financial recordkeeping and applicable
            legal obligations.
          </li>
          <li>
            Analytics preference information is retained in the browser for up
            to 180 days, unless you clear it earlier.
          </li>
        </ul>
        <p>
          Retention periods may vary depending on the type of information, the
          purpose for which it was collected, applicable legal requirements and
          operational needs. We review information and delete or anonymize it
          when it is no longer reasonably necessary, subject to lawful retention
          requirements.
        </p>
      </>
    ),
  },
  {
    title: "9. Your Privacy Rights",
    content: (
      <>
        <p>
          Subject to applicable law and any relevant limitations, you may have
          the right to:
        </p>
        <ul>
          <li>Request access to personal information we hold about you.</li>
          <li>Request correction of inaccurate or incomplete information.</li>
          <li>Request deletion of personal information where applicable.</li>
          <li>Withdraw consent where processing is based on consent.</li>
          <li>Object to or request restriction of certain processing.</li>
          <li>
            Request information about how your personal information is
            processed.
          </li>
          <li>
            Lodge a complaint with the Nigeria Data Protection Commission where
            you believe your data protection rights have been infringed.
          </li>
        </ul>
        <p>
          You can withdraw or change your optional analytics consent at any time
          using the Privacy settings control on the public website. Withdrawing
          consent stops future analytics collection through the
          consent-controlled Google Analytics implementation. It does not affect
          processing that took place before withdrawal.
        </p>
        <p>
          To exercise a privacy right, please contact us through our{" "}
          <Link
            href="/contact"
            className="font-semibold text-[#a78348] hover:underline"
          >
            Contact page
          </Link>
          . We may need to verify your identity before responding.
        </p>
      </>
    ),
  },
  {
    title: "10. Information Security",
    content: (
      <p>
        We use reasonable technical and organizational measures intended to
        protect personal information against unauthorized access, loss,
        alteration or disclosure. However, no website, internet transmission or
        electronic storage system can be guaranteed to be completely secure.
      </p>
    ),
  },
  {
    title: "11. Children's Privacy",
    content: (
      <p>
        TrendPilot is not intended to knowingly collect personal information
        from children in circumstances where parental consent or other
        safeguards are required by applicable law. If you believe a child has
        provided personal information inappropriately, please contact us so that
        we can review the matter.
      </p>
    ),
  },
  {
    title: "12. Third-Party Websites",
    content: (
      <>
        <p>
          Our articles or pages may contain links to third-party websites,
          including merchants, affiliate networks and advertisers. These
          websites operate independently and have their own privacy policies,
          cookies and data collection practices. We encourage you to review
          their policies before providing personal information or completing a
          transaction.
        </p>
        <p>
          Some links are affiliate links. If you follow an affiliate link and
          complete a qualifying transaction, TrendPilot may receive a commission
          or other compensation from the relevant affiliate partner, subject to
          that partner&apos;s terms. We aim to identify applicable affiliate
          links near the relevant content.
        </p>
        <p>
          When you follow an affiliate or advertisement link, the destination
          website may collect information about your visit, device or
          transaction under its own privacy practices. Our recording of a
          referral click does not mean that we receive your complete transaction
          details or that a purchase has occurred.
        </p>
        <p>
          We are not responsible for the privacy, security or content practices
          of external websites. Any interaction or transaction you have with
          them is subject to their applicable terms and policies.
        </p>
      </>
    ),
  },
  {
    title: "13. Changes to This Policy",
    content: (
      <p>
        We may update this Privacy Policy when our services, data practices or
        legal obligations change. The updated version will be published on this
        page with a revised effective date. We encourage you to review this page
        periodically.
      </p>
    ),
  },
  {
    title: "14. Contact and Privacy Requests",
    content: (
      <>
        <p>
          If you have questions about this policy or how your personal
          information is handled, please contact us through the TrendPilot
          Contact page.
        </p>
        <Link
          href="/contact"
          className="inline-flex items-center gap-2 font-semibold text-[#a78348] hover:underline"
        >
          Contact TrendPilot <span aria-hidden="true">→</span>
        </Link>
      </>
    ),
  },
];

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[#f8f7f4]">
      <header
        className="relative flex min-h-[360px] items-center overflow-hidden bg-[#101d30] bg-cover bg-center px-6 py-20 text-white sm:min-h-[420px] sm:py-24"
        style={{
          backgroundImage: `
      linear-gradient(
        90deg,
        rgba(16, 29, 48, 0.96) 0%,
        rgba(16, 29, 48, 0.86) 45%,
        rgba(16, 29, 48, 0.52) 100%
      ),
      url('/images/privacy-data-protection.png')
    `,
          backgroundPosition: "center 45%",
          backgroundSize: "cover",
        }}
      >
        <div className="relative mx-auto w-full max-w-4xl">
          <p className="mb-5 text-xs font-semibold tracking-[0.25em] text-[#d5b77e] uppercase">
            Your privacy matters
          </p>

          <h1 className="max-w-3xl font-serif text-5xl leading-tight font-semibold tracking-tight text-white sm:text-6xl">
            Privacy Policy
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-8 text-white/80 sm:text-lg">
            This policy explains what personal information TrendPilot collects,
            why we use it and the choices available to you when using our
            website.
          </p>

          <p className="mt-6 text-sm font-medium text-white/65">
            Effective date: 25 November 2026
          </p>
        </div>
      </header>

      <section className="px-6 py-14 sm:py-20">
        <div className="mx-auto max-w-4xl">
          <div className="mb-10 rounded-xl border border-[#e7e1d6] bg-white p-6 sm:p-8">
            <p className="text-sm leading-7 text-[#536071]">
              This Privacy Policy is intended to explain TrendPilot&apos;s
              current data practices in clear language. It should be reviewed
              and updated whenever the website&apos;s features, service
              providers or data practices change.
            </p>
          </div>

          <div className="space-y-10">
            {sections.map((section) => (
              <section
                key={section.title}
                className="border-b border-[#e7e1d6] pb-9 last:border-b-0"
              >
                <h2 className="mb-4 font-serif text-2xl font-semibold text-[#101d30]">
                  {section.title}
                </h2>
                <div className="space-y-4 text-[15px] leading-8 text-[#536071] [&_li]:ml-5 [&_li]:list-disc [&_strong]:font-semibold [&_strong]:text-[#26364a] [&_ul]:space-y-2">
                  {section.content}
                </div>
              </section>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
