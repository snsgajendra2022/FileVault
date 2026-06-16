import { ArrowRight, BookOpenText } from "lucide-react";
import { blogs } from "../data/blogs";

export default function BlogSection() {
  return (
    <section id="blogs" className="section-padding bg-white">
      <div className="container-page">
        <div className="mb-10 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <span className="section-label">Blog</span>
            <h2 className="text-2xl font-bold leading-tight tracking-tight text-slate-900 md:text-4xl">
              Blog pages to help Google understand your app.
            </h2>
          </div>
          <p className="max-w-xs text-base leading-7 text-slate-600">
            Built around keywords like digital album app, wedding album app, flipbook app, and guest book app.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {blogs.map((blog, index) => (
            <a
              key={blog.slug}
              href={`/blog/${blog.slug}`}
              className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-600/8"
            >
              <div className="absolute right-0 top-0 h-28 w-28 translate-x-8 -translate-y-8 rounded-full bg-blue-50 blur-2xl transition group-hover:bg-sky-100" />
              <div className="relative">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white">
                  <BookOpenText size={20} />
                </div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-blue-600">Article 0{index + 1}</p>
                <h3 className="text-xl font-bold tracking-tight text-slate-900">{blog.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{blog.description}</p>
                <span className="mt-4 inline-flex items-center text-sm font-semibold text-blue-600">
                  Read blog <ArrowRight className="ml-1.5 transition group-hover:translate-x-0.5" size={16} />
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
