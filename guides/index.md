---
layout: default
title: Guides
permalink: /guides/
---

<div class="guides-container">

<div class="page-header">
  <h1 class="page-title">Guides</h1>
  <p class="page-description">Developer reference pages for tools, APIs, and setup patterns used in the notebooks and posts on this blog.</p>
</div>

<div class="post-list">
  {% assign sorted_guides = site.guides | sort: 'date' | reverse %}
  {% for guide in sorted_guides %}
  <article class="post-card">
    <h2 class="post-card-title">
      <a href="{{ guide.url | relative_url }}">{{ guide.title }}</a>
    </h2>
    {% if guide.description %}
    <p class="post-card-excerpt">{{ guide.description }}</p>
    {% endif %}
    <div class="post-card-meta">
      {% if guide.date %}<time datetime="{{ guide.date | date_to_xmlschema }}">{{ guide.date | date: "%B %-d, %Y" }}</time>{% endif %}
      {% if guide.tags and guide.tags.size > 0 %}
      <span class="post-card-tags">
        {% for tag in guide.tags %}
        <a href="{{ site.baseurl }}/tags/#{{ tag | strip }}" class="tag-chip">{{ tag | strip }}</a>
        {% endfor %}
      </span>
      {% endif %}
    </div>
  </article>
  {% endfor %}
</div>

</div>
