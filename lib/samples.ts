/**
 * Sample HTML payloads for demo and testing.
 * Each is realistic HTML (not Lorem Ipsum) with varied tag types.
 */

export type Sample = {
  name: string;
  description: string;
  html: string;
};

export const samples: Sample[] = [
  {
    name: "Job Listing",
    description: "A job post with headings, lists, links, and a form",
    html: `<article class="job-listing" data-id="sr-frontend-2024">
  <header>
    <div class="company">
      <img src="/logos/acme-corp.png" alt="Acme Corp" class="logo" />
      <span class="company-name">Acme Corp</span>
    </div>
    <h1 class="job-title">Senior Frontend Engineer</h1>
    <div class="meta">
      <span class="location">San Francisco, CA (Remote OK)</span>
      <span class="salary">$160,000 - $210,000</span>
      <span class="type">Full-time</span>
    </div>
  </header>

  <section class="description">
    <h2>About the Role</h2>
    <p>We are looking for a Senior Frontend Engineer to lead development of our
    next-generation dashboard. You will work closely with design and backend
    teams to deliver fast, accessible, and beautiful user interfaces.</p>
  </section>

  <section class="requirements">
    <h2>Requirements</h2>
    <ul>
      <li>5+ years of experience with JavaScript and TypeScript</li>
      <li>Strong experience with React and Next.js</li>
      <li>Deep understanding of CSS, responsive design, and accessibility</li>
      <li>Experience with testing frameworks (Jest, Playwright)</li>
      <li>Excellent communication and collaboration skills</li>
    </ul>
  </section>

  <section class="benefits">
    <h2>Benefits</h2>
    <ul>
      <li>Competitive equity package</li>
      <li>Unlimited PTO</li>
      <li>$5,000 annual learning budget</li>
      <li>Health, dental, and vision insurance</li>
    </ul>
  </section>

  <footer class="apply">
    <a href="/jobs/sr-frontend-2024/apply" class="apply-btn">Apply Now</a>
    <a href="/jobs" class="back-link">View All Positions</a>
  </footer>
</article>`,
  },
  {
    name: "E-commerce Product",
    description: "A product page with images, prices, reviews, and data attributes",
    html: `<div class="product-page" data-product-id="SKU-88421">
  <nav class="breadcrumb">
    <a href="/">Home</a> &gt;
    <a href="/electronics">Electronics</a> &gt;
    <a href="/electronics/headphones">Headphones</a>
  </nav>

  <div class="product-main">
    <div class="gallery">
      <img src="/images/products/nova-pro-1.jpg" alt="Nova Pro Headphones - Front view" class="main-image" data-zoom="/images/products/nova-pro-1-hires.jpg" />
      <div class="thumbnails">
        <img src="/images/products/nova-pro-2.jpg" alt="Side view" data-index="1" />
        <img src="/images/products/nova-pro-3.jpg" alt="With case" data-index="2" />
        <img src="/images/products/nova-pro-4.jpg" alt="Worn by model" data-index="3" />
      </div>
    </div>

    <div class="product-info">
      <h1 class="product-name">Nova Pro Wireless Headphones</h1>
      <div class="rating" data-score="4.7">
        <span class="stars">&#9733;&#9733;&#9733;&#9733;&#9734;</span>
        <span class="review-count">2,847 reviews</span>
      </div>
      <p class="price" data-currency="USD">
        <span class="current-price">$279.99</span>
        <span class="original-price">$349.99</span>
        <span class="discount">20% off</span>
      </p>
      <p class="availability in-stock">In Stock - Ships within 24 hours</p>

      <form class="add-to-cart" action="/cart/add" method="post">
        <input type="hidden" name="product_id" value="SKU-88421" />
        <label for="color">Color:</label>
        <select id="color" name="color">
          <option value="matte-black">Matte Black</option>
          <option value="silver">Silver</option>
          <option value="midnight-blue">Midnight Blue</option>
        </select>
        <button type="submit" class="cart-btn">Add to Cart</button>
      </form>
    </div>
  </div>

  <section class="reviews" id="reviews">
    <h2>Customer Reviews</h2>
    <div class="review" data-author="Sarah K." data-rating="5">
      <strong>Incredible sound quality</strong>
      <p>Best headphones I have ever owned. The noise cancellation is superb
      and battery lasts over 30 hours on a single charge.</p>
    </div>
    <div class="review" data-author="Mike T." data-rating="4">
      <strong>Great but pricey</strong>
      <p>Sound is amazing, build quality is solid. Wish they were a bit cheaper
      but you get what you pay for.</p>
    </div>
  </section>
</div>`,
  },
  {
    name: "Email Template",
    description: "A table-based HTML email with inline styles and nested tables",
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your Order Confirmation</title>
  <style>
    body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
    .wrapper { max-width: 600px; margin: 0 auto; }
  </style>
</head>
<body style="background-color: #f4f4f4; margin: 0; padding: 20px;">
  <table class="wrapper" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-collapse: collapse;">
    <tr>
      <td style="padding: 30px 40px; background-color: #2d3748; text-align: center;">
        <img src="/email/logo-white.png" alt="ShopWave" width="180" style="display: block; margin: 0 auto;" />
      </td>
    </tr>
    <tr>
      <td style="padding: 40px;">
        <h1 style="color: #2d3748; font-size: 24px; margin: 0 0 20px;">Order Confirmed! 🎉</h1>
        <p style="color: #4a5568; line-height: 1.6;">Hi Alex, thanks for your order! Here is a summary of what you purchased:</p>

        <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse: collapse; margin: 20px 0;">
          <tr style="background-color: #edf2f7;">
            <th style="text-align: left; color: #2d3748;">Item</th>
            <th style="text-align: right; color: #2d3748;">Price</th>
          </tr>
          <tr>
            <td style="border-bottom: 1px solid #e2e8f0;">Nova Pro Wireless Headphones</td>
            <td style="border-bottom: 1px solid #e2e8f0; text-align: right;">$279.99</td>
          </tr>
          <tr>
            <td style="border-bottom: 1px solid #e2e8f0;">USB-C Charging Cable (2-pack)</td>
            <td style="border-bottom: 1px solid #e2e8f0; text-align: right;">$12.99</td>
          </tr>
          <tr>
            <td style="border-bottom: 1px solid #e2e8f0;">Carrying Case</td>
            <td style="border-bottom: 1px solid #e2e8f0; text-align: right;">$34.99</td>
          </tr>
          <tr>
            <td style="font-weight: bold;">Total</td>
            <td style="font-weight: bold; text-align: right;">$327.97</td>
          </tr>
        </table>

        <p style="color: #4a5568;">Your order will ship within 24 hours. Track it here:</p>
        <a href="/orders/ORD-90821/track" style="display: inline-block; background-color: #4299e1; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Track Your Order</a>
      </td>
    </tr>
    <tr>
      <td style="padding: 20px 40px; background-color: #edf2f7; text-align: center; font-size: 12px; color: #718096;">
        <p>ShopWave Inc. | 123 Commerce St, San Francisco, CA 94102</p>
        <a href="/unsubscribe" style="color: #4299e1;">Unsubscribe</a> |
        <a href="/privacy" style="color: #4299e1;">Privacy Policy</a>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },
];
