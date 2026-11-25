import Link from "next/link";

export const metadata = {
  title: "Terms of Use | TrendPilot",
  description:
    "Read the terms and conditions governing access to and use of the TrendPilot website, articles and community features.",
  alternates: {
    canonical: "/terms",
  },
  openGraph: {
    title: "Terms of Use | TrendPilot",
    description: "Understand the rules and conditions for using TrendPilot.",
    url: "/terms",
    type: "website",
  },
};

const sections = [
  {
    title: "1. About These Terms",
    content: (
      <>
        <p>
          These Terms of Use govern your access to and use of TrendPilot,
          including its website, articles, newsletter, comments and other
          features made available through the platform.
        </p>
        <p>
          TrendPilot is an online publication and digital platform operated by
          an individual based in Nigeria.
        </p>
        <p>
          By accessing or using TrendPilot, you agree to these Terms. If you do
          not agree, you should discontinue using the website.
        </p>
      </>
    ),
  },
  {
    title: "2. Eligibility and Accounts",
    content: (
      <>
        <p>
          You may browse publicly available content without creating an account.
          Certain features may require registration or additional information.
        </p>
        <p>When creating or maintaining an account, you agree to:</p>
        <ul>
          <li>Provide accurate and reasonably up-to-date information.</li>
          <li>Keep your login credentials confidential.</li>
          <li>
            Take reasonable steps to prevent unauthorized access to your
            account.
          </li>
          <li>
            Notify us through the Contact page if you become aware of
            unauthorized access or suspicious account activity.
          </li>
          <li>
            Not impersonate another person or create an account using misleading
            information.
          </li>
        </ul>
        <p>
          You are responsible for activity carried out through your account,
          except to the extent that applicable law provides otherwise.
        </p>
        <p>
          We may restrict or suspend account access where reasonably necessary
          to protect users, the platform or its security, or where these Terms
          have been violated.
        </p>
      </>
    ),
  },
  {
    title: "3. Acceptable Use",
    content: (
      <>
        <p>
          You agree to use TrendPilot lawfully and responsibly. You must not:
        </p>
        <ul>
          <li>
            Violate applicable laws, regulations or the rights of other people.
          </li>
          <li>
            Post content that is unlawful, fraudulent, threatening, defamatory,
            abusive, discriminatory or deliberately misleading.
          </li>
          <li>
            Harass, impersonate, intimidate or attempt to harm another user.
          </li>
          <li>
            Publish spam, unsolicited promotions or deceptive advertisements.
          </li>
          <li>
            Upload malicious software or attempt to compromise the website, its
            database or its security controls.
          </li>
          <li>
            Attempt unauthorized access to accounts, administrative areas or
            restricted platform resources.
          </li>
          <li>
            Scrape, harvest or collect information from the website through
            automated means in a manner that violates these Terms or applicable
            law.
          </li>
          <li>
            Interfere with the availability, performance or normal operation of
            the platform.
          </li>
          <li>
            Use TrendPilot to infringe intellectual property, privacy or other
            legal rights.
          </li>
        </ul>
        <p>
          We may investigate suspected misuse and take reasonable action to
          protect the platform and its users.
        </p>
      </>
    ),
  },
  {
    title: "4. Articles and Informational Content",
    content: (
      <>
        <p>
          TrendPilot publishes articles, guides, commentary and other
          informational material across subjects that may include business,
          technology, finance, education, lifestyle and innovation.
        </p>
        <p>
          Content is provided for general informational and educational
          purposes. It is not intended to constitute personalised financial,
          investment, legal, tax, medical or other professional advice.
        </p>
        <p>
          You should independently assess information before relying on it and
          seek qualified professional advice where appropriate.
        </p>
        <p>
          Although we aim to publish useful and accurate information, we do not
          guarantee that every article is complete, current, error-free or
          suitable for your particular circumstances. Information may become
          outdated or change without notice.
        </p>
        <p>
          Any decisions you make based on information published on TrendPilot
          remain your responsibility.
        </p>
      </>
    ),
  },
  {
    title: "5. Comments and User Contributions",
    content: (
      <>
        <p>
          TrendPilot may allow users to submit comments, replies or other
          contributions through available community features.
        </p>
        <p>
          You retain ownership of content you create, subject to rights you
          grant to us under these Terms.
        </p>
        <p>
          By submitting content, you grant TrendPilot a non-exclusive,
          worldwide, royalty-free licence to host, store, display, reproduce and
          make the content available as reasonably necessary to operate,
          maintain and promote the relevant website features.
        </p>
        <p>
          You confirm that you have the rights and permissions necessary to
          submit the content and grant this licence.
        </p>
        <p>You must not submit content that:</p>
        <ul>
          <li>Violates another person&apos;s intellectual property rights.</li>
          <li>Contains unlawful threats, harassment or targeted abuse.</li>
          <li>Contains spam, scams or deceptive promotional material.</li>
          <li>
            Discloses another person&apos;s private or confidential information
            without authorization.
          </li>
          <li>
            Contains malicious links, harmful files or other security threats.
          </li>
        </ul>
        <p>
          We reserve the right to review, remove, restrict or decline
          contributions that violate these Terms or that we reasonably consider
          harmful to the community or platform.
        </p>
        <p>
          We do not guarantee that user-submitted content will always remain
          available or visible.
        </p>
      </>
    ),
  },
  {
    title: "6. Intellectual Property",
    content: (
      <>
        <p>
          Unless otherwise indicated, TrendPilot&apos;s original website content
          and materials, including its branding, design, graphics, text,
          editorial material and software, are owned by or licensed to the
          platform operator and are protected by applicable intellectual
          property laws.
        </p>
        <p>
          You may access and use publicly available content for personal,
          non-commercial purposes.
        </p>
        <p>
          You must not reproduce, republish, redistribute, commercially exploit,
          modify or create derivative works from our materials without prior
          permission, except where permitted by law.
        </p>
        <p>
          You may share links to publicly available TrendPilot pages, provided
          that you do not misrepresent the source, imply unauthorized
          endorsement or remove relevant ownership notices.
        </p>
        <p>
          Third-party names, trademarks, images and materials remain the
          property of their respective owners and may be subject to separate
          terms or licences.
        </p>
      </>
    ),
  },
  {
    title: "7. Advertising and Sponsored Content",
    content: (
      <>
        <p>
          TrendPilot may display advertisements, sponsored content or other
          promotional material.
        </p>
        <p>
          Where applicable, advertising and sponsored placements will be
          identified so that readers can distinguish promotional material from
          independent editorial content.
        </p>
        <p>
          The appearance of an advertisement does not necessarily mean that
          TrendPilot independently recommends, verifies or guarantees the
          advertised product, service or advertiser.
        </p>
        <p>
          Advertisers are responsible for the accuracy, legality and
          substantiation of their promotional claims and for complying with
          applicable advertising requirements.
        </p>
        <p>
          We may decline, suspend or remove advertisements that do not meet our
          platform requirements or applicable law.
        </p>
      </>
    ),
  },
  {
    title: "8. Affiliate Links and Commissions",
    content: (
      <>
        <p>
          Some TrendPilot articles or pages may contain affiliate links to
          external merchants, products, services or affiliate networks.
        </p>
        <p>
          If you follow an affiliate link and complete a qualifying transaction,
          TrendPilot may receive a commission or other compensation from the
          relevant partner, subject to that partner&apos;s programme terms.
        </p>
        <p>
          We aim to identify affiliate links or relevant recommendations clearly
          near the associated content.
        </p>
        <p>
          Affiliate relationships do not guarantee that a product or service is
          suitable for your needs. You should independently review the product
          information, pricing, terms and conditions before making a purchase.
        </p>
        <p>
          Purchases, payments, refunds, delivery, warranties and customer
          support are generally handled by the relevant external merchant or
          service provider, not TrendPilot.
        </p>
      </>
    ),
  },
  {
    title: "9. Third-Party Websites and Services",
    content: (
      <>
        <p>
          TrendPilot may contain links to external websites and services,
          including advertisers, merchants, affiliate partners and other
          third-party platforms.
        </p>
        <p>
          These services operate independently and may have their own terms,
          privacy policies, security practices and transaction requirements.
        </p>
        <p>
          We do not control or guarantee the availability, accuracy, safety or
          performance of third-party websites, products or services.
        </p>
        <p>
          Your interactions and transactions with third parties are between you
          and the relevant third party. You should review their applicable terms
          before proceeding.
        </p>
      </>
    ),
  },
  {
    title: "10. Newsletter and Communications",
    content: (
      <>
        <p>
          TrendPilot may provide newsletter or other subscription-based
          communications where available.
        </p>
        <p>
          By subscribing, you agree that we may use the contact information you
          provide to deliver the requested communications.
        </p>
        <p>
          You may unsubscribe using the link or instructions included in
          relevant newsletter emails.
        </p>
        <p>
          Unsubscribing from a newsletter does not necessarily affect essential
          account, security or service-related communications.
        </p>
      </>
    ),
  },
  {
    title: "11. Privacy and Personal Information",
    content: (
      <>
        <p>
          Our collection and use of personal information are explained in our{" "}
          <Link
            href="/privacy-policy"
            className="font-semibold text-[#a78348] hover:underline"
          >
            Privacy Policy
          </Link>
          .
        </p>
        <p>
          By using TrendPilot, you acknowledge that personal information may be
          processed as described in that policy and in accordance with
          applicable data protection laws.
        </p>
        <p>These Terms should be read together with the Privacy Policy.</p>
      </>
    ),
  },
  {
    title: "12. Website Availability and Changes",
    content: (
      <>
        <p>
          We aim to keep TrendPilot available and functioning, but we do not
          guarantee uninterrupted, error-free or continuous access.
        </p>
        <p>
          We may modify, suspend, restrict or discontinue any feature or part of
          the website where reasonably necessary for maintenance, security,
          operational, legal or other legitimate reasons.
        </p>
        <p>
          We may also update, correct, replace or remove articles and other
          published materials.
        </p>
      </>
    ),
  },
  {
    title: "13. Disclaimers",
    content: (
      <>
        <p>
          {`To the extent permitted by applicable law, TrendPilot is provided on
          an "as is" and "as available" basis.`}
        </p>
        <p>
          We do not make guarantees that the website will always be available,
          secure, accurate, complete or free from errors, interruptions or
          harmful components.
        </p>
        <p>
          We do not warrant that information published on the platform will meet
          your individual requirements or produce any particular result.
        </p>
        <p>
          Nothing in these Terms excludes a right, remedy, warranty or liability
          that cannot lawfully be excluded or restricted under applicable law.
        </p>
      </>
    ),
  },
  {
    title: "14. Limitation of Liability",
    content: (
      <>
        <p>
          To the extent permitted by applicable law, TrendPilot and the
          individual operating the platform will not be liable for indirect,
          incidental, special or consequential loss arising from your use of, or
          inability to use, the website.
        </p>
        <p>
          This includes losses arising from reliance on general informational
          content, third-party products or services, external website activity,
          service interruptions or unauthorized access beyond reasonable
          control.
        </p>
        <p>
          Nothing in these Terms excludes or limits liability where such
          exclusion or limitation is prohibited by applicable law, including
          liability that cannot legally be waived.
        </p>
      </>
    ),
  },
  {
    title: "15. Suspension and Termination",
    content: (
      <>
        <p>
          We may suspend, restrict or terminate access to some or all TrendPilot
          features if we reasonably believe that:
        </p>
        <ul>
          <li>You have materially breached these Terms.</li>
          <li>Your activity creates a security or operational risk.</li>
          <li>Your use of the platform violates applicable law.</li>
          <li>Restriction is necessary to protect users or the platform.</li>
        </ul>
        <p>
          Where reasonably practicable, we may provide an explanation or
          opportunity to address the issue. This does not prevent urgent action
          where necessary to protect the platform or comply with law.
        </p>
        <p>
          You may stop using TrendPilot at any time. Account-related requests
          may be submitted through the Contact page, subject to applicable legal
          and operational requirements.
        </p>
      </>
    ),
  },
  {
    title: "16. Changes to These Terms",
    content: (
      <p>
        We may revise these Terms when our services, platform features or legal
        obligations change. Updated Terms will be published on this page with a
        revised effective date. Your continued use of TrendPilot after revised
        Terms take effect constitutes acceptance of the updated Terms to the
        extent permitted by applicable law. If you do not agree with the
        changes, you should stop using the affected services.
      </p>
    ),
  },
  {
    title: "17. Governing Law and Disputes",
    content: (
      <>
        <p>
          These Terms are governed by the laws of the Federal Republic of
          Nigeria, without prejudice to any mandatory legal protections that
          apply to you.
        </p>
        <p>
          If a dispute arises in connection with TrendPilot or these Terms, we
          encourage you to contact us first so that we can attempt to resolve
          the matter informally.
        </p>
        <p>
          Where a dispute cannot be resolved informally, it may be referred to a
          court of competent jurisdiction in Nigeria, subject to applicable law.
        </p>
      </>
    ),
  },
  {
    title: "18. Contact",
    content: (
      <>
        <p>
          If you have questions about these Terms or your use of TrendPilot,
          please contact us through the website&apos;s Contact page.
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

export default function TermsPage() {
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
    url('/images/gavel-and-golden-scales-of-justice.png')
  `,
          backgroundPosition: "center 45%",
          backgroundSize: "cover",
        }}
      >
        <div className="relative mx-auto w-full max-w-4xl">
          <p className="mb-5 text-xs font-semibold tracking-[0.25em] text-[#d5b77e] uppercase">
            Clear and responsible use
          </p>

          <h1 className="max-w-3xl font-serif text-5xl leading-tight font-semibold tracking-tight text-white sm:text-6xl">
            Terms of Use
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-8 text-white/80 sm:text-lg">
            These Terms explain the conditions for accessing and using
            TrendPilot, including its articles, accounts and community features.
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
              Please read these Terms carefully before using TrendPilot. They
              describe the rules that apply to your use of the platform and
              should be read together with our Privacy Policy.
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
