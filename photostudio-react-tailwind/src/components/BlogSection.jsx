import { ArrowRight } from "lucide-react";
import { blogs } from "../data/blogs";

export default function BlogSection() {
  return (
    <section id="blogs" className="om-section om-section--soft">
      <div className="container-page">
        <div className="om-section__intro">
          <p className="om-kicker">Blog</p>
          <h2 className="om-heading">Blog pages to help Google understand your app.</h2>
          <p className="om-subcopy">
            Built around keywords like digital album app, wedding album app, flipbook app, and guest book app.
          </p>
        </div>

        <div className="om-blog-grid">
          {blogs.map((blog, index) => (
            <a
              key={blog.slug}
              href={`/blog/${blog.slug}`}
              className={`om-blog-card${index === 0 ? " om-blog-card--lead" : ""}`}
            >
              <span className="om-blog-card__index">
                Article {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="om-blog-card__title">{blog.title}</h3>
              <p className="om-blog-card__desc">{blog.description}</p>
              <span className="om-blog-card__link">
                Read blog <ArrowRight size={15} aria-hidden />
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
