import Link from "next/link";
import { ArrowRight, Mail, MessageCircle, Send } from "lucide-react";
import ContactForm from "@/features/contact/components/ContactForm";

export const metadata = {
  title: "Contact Us | TrendPilot",
  description:
    "Get in touch with TrendPilot. Send us your questions, feedback, suggestions or business enquiries.",
  alternates: {
    canonical: "/contact",
  },
  openGraph: {
    title: "Contact TrendPilot",
    description:
      "Have a question, suggestion or enquiry? We'd be glad to hear from you.",
    type: "website",
  },
};

export default function ContactPage() {
  return (
    <div className="font-sans">
      <section className="relative isolate overflow-hidden bg-[#101d30]">
        <div className="hero-pattern absolute inset-0 -z-10 opacity-20" />
        <div className="absolute -top-32 right-[-5%] -z-10 h-96 w-96 rounded-full bg-[#b99658]/15 blur-3xl" />

        <div className="container-main py-20 sm:py-28">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-3 border border-white/20 bg-white/10 px-4 py-3">
              <span className="h-2 w-2 rounded-full bg-[#d5b77e]" />
              <span className="text-[10px] font-bold tracking-[0.2em] text-[#e6d4b3] uppercase">
                Get in touch
              </span>
            </div>

            <h1 className="mt-8 text-5xl leading-[1.08] font-bold tracking-[-0.045em] text-white sm:text-6xl lg:text-7xl">
              We&apos;d love to
              <span className="mt-3 block text-[#d5b77e]">hear from you.</span>
            </h1>

            <p className="mt-8 max-w-2xl text-sm leading-8 text-gray-200 sm:text-base">
              Have a question, suggestion, feedback or business enquiry? Send us
              a message. We&apos;re interested in hearing what you have to say.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="container-main grid gap-12 py-16 sm:py-20 lg:grid-cols-[0.75fr_1.25fr] lg:gap-20">
          <aside>
            <p className="text-xs font-bold tracking-[0.18em] text-[#a78348] uppercase">
              Contact TrendPilot
            </p>

            <h2 className="mt-4 text-3xl leading-tight font-bold tracking-tight text-[#14243d] sm:text-4xl">
              Let&apos;s start a conversation.
            </h2>

            <p className="mt-5 text-sm leading-8 text-gray-600">
              Whether you&apos;re a reader with a question, someone with
              feedback about our content, or an organisation interested in
              working with us, you can reach out using the form.
            </p>

            <div className="mt-9 space-y-6">
              <div className="flex gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center bg-[#f6f1e7] text-[#a78348]">
                  <Mail size={21} />
                </div>
                <div>
                  <h3 className="font-bold text-[#14243d]">
                    General enquiries
                  </h3>
                  <p className="mt-1 text-sm leading-7 text-gray-600">
                    Questions, feedback and suggestions about TrendPilot.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center bg-[#f6f1e7] text-[#a78348]">
                  <MessageCircle size={21} />
                </div>
                <div>
                  <h3 className="font-bold text-[#14243d]">
                    Business enquiries
                  </h3>
                  <p className="mt-1 text-sm leading-7 text-gray-600">
                    Partnerships, collaborations and other professional
                    enquiries.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center bg-[#f6f1e7] text-[#a78348]">
                  <Send size={21} />
                </div>
                <div>
                  <h3 className="font-bold text-[#14243d]">
                    Send us a message
                  </h3>
                  <p className="mt-1 text-sm leading-7 text-gray-600">
                    Complete the contact form and submit your enquiry.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-10 border-l-2 border-[#b99658] bg-[#fcfbf9] p-5">
              <p className="text-sm leading-7 text-gray-600">
                Looking to explore our content while you&apos;re here?
              </p>
              <Link
                href="/articles"
                className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-[#14243d] transition hover:text-[#a78348]"
              >
                Browse our articles
                <ArrowRight size={15} />
              </Link>
            </div>
          </aside>

          <div className="border border-[#eeeae2] bg-[#fcfbf9] p-6 sm:p-9 lg:p-10">
            <p className="text-xs font-bold tracking-[0.18em] text-[#a78348] uppercase">
              Send a message
            </p>

            <h2 className="mt-3 text-2xl font-bold text-[#14243d] sm:text-3xl">
              How can we help?
            </h2>

            <p className="mt-3 mb-8 text-sm leading-7 text-gray-600">
              Fill in the details below and we&apos;ll receive your message.
            </p>

            <ContactForm />
          </div>
        </div>
      </section>

      <section className="bg-[#101d30]">
        <div className="container-main py-14 text-center sm:py-16">
          <p className="text-xs font-bold tracking-[0.2em] text-[#d5b77e] uppercase">
            Keep exploring
          </p>

          <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Discover something worth knowing.
          </h2>

          <p className="mx-auto mt-4 max-w-xl text-sm leading-8 text-gray-300">
            Explore useful insights, practical knowledge and fresh perspectives
            across TrendPilot.
          </p>

          <Link
            href="/articles"
            className="mt-8 inline-flex items-center gap-3 bg-[#c7a56c] px-7 py-4 text-xs font-bold text-[#14243d] transition hover:bg-[#e0c895]"
          >
            Explore articles
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}
