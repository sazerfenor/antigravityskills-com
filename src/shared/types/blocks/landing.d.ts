import { ReactNode } from 'react';

import {
  AgreementNav,
  Brand,
  Button,
  Nav,
  NavItem,
  SocialNav,
  UserNav,
} from './common';
import { FormSubmit } from './form';

// Section visibility control for landing page
export interface SectionVisibility {
  show_header?: boolean;
  show_hero?: boolean;
  show_hero_buttons?: boolean;
  show_hero_avatars?: boolean;
  show_hero_award?: boolean;
  show_hero_tip?: boolean;
  show_logos?: boolean;
  show_introduce?: boolean;
  show_benefits?: boolean;
  show_usage?: boolean;
  show_features?: boolean;
  show_stats?: boolean;
  show_gallery?: boolean;
  show_testimonials?: boolean;
  show_faq?: boolean;
  show_cta?: boolean;
  show_subscribe?: boolean;
  show_footer?: boolean;
  show_generator?: boolean;
  show_core_modules?: boolean;
}

export interface SectionItem extends NavItem {
  [key: string]: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export interface Section {
  id?: string;
  block?: string;
  label?: string;
  sr_only_title?: string;
  title?: string;
  description?: string;
  tip?: string;
  buttons?: Button[];
  icon?: string | ReactNode;
  image?: Image;
  image_invert?: Image;
  items?: SectionItem[];
  image_position?: 'left' | 'right' | 'top' | 'bottom' | 'center';
  text_align?: 'left' | 'center' | 'right';
  className?: string;
  component?: ReactNode;
  background_image?: Image;
  [key: string]: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

// header props for header component
export interface Header {
  id?: string;
  brand?: Brand;
  nav?: Nav;
  buttons?: Button[];
  user_nav?: UserNav;
  show_theme?: boolean;
  show_locale?: boolean;
  show_sign?: boolean;
  className?: string;
}

// footer props for footer component
export interface Footer {
  id?: string;
  brand?: Brand;
  nav?: Nav;
  copyright?: string;
  disclaimer?: string;
  social?: SocialNav;
  agreement?: AgreementNav;
  show_theme?: boolean;
  show_locale?: boolean;
  show_social?: boolean;
  show_built_with?: boolean;
  className?: string;
}

// hero props for hero component
export interface Hero extends Section {
  id?: string;
  announcement?: Button;
  show_buttons?: boolean;
  show_avatars?: boolean;
  avatars_tip?: string;
  show_award?: boolean;
  show_tip?: boolean;
  highlight_text?: string;
  input?: {
    placeholder?: string;
    button?: string;
  };
}

export interface Logos extends Section {}

export interface Features extends Section {
  header_badge?: string;
  header_title?: string;
  header_highlight?: string;
  header_description?: string;
  before_after?: {
    before: { label: string; prompt: string; image: string };
    after: { label: string; prompt: string; image: string };
  };
}

export interface Stats extends Section {}

export interface Showcases extends Section {}

export interface FAQItem extends SectionItem {
  question?: string;
  answer?: string;
}

export interface FAQ extends Section {
  items?: FAQItem[];
}

export interface CTA extends Section {}

export interface Subscribe extends Section {
  submit?: FormSubmit;
  show_subscribe?: boolean;
}

export interface TestimonialsItem extends SectionItem {
  name?: string;
  role?: string;
  quote?: string;
  avatar?: Image;
  rating?: number;
}

export interface Testimonials extends Section {
  items?: TestimonialsItem[];
}

export interface GalleryItem extends SectionItem {
  name?: string;
  creator?: string;
  creator_url?: string;
  prompt?: string;
  likes?: number;
  is_premium?: boolean;
  tags?: string[];
}

// Gallery Entrance - Category Card Data
export interface GalleryCategoryItem {
  slug: string;           // photography, art-illustration, etc.
  title: string;          // Display name
  count: number;          // Prompt count
  icon: string;           // Lucide icon name
  coverImage: string;     // Cover image URL
}

// Gallery Entrance - Trending Topic Data
export interface GalleryTrendingItem {
  slug: string;           // face-lock, y2k-flash, etc.
  title: string;          // Display name
  count: number;          // Prompt count
}

export interface Gallery extends Section {
  items?: GalleryItem[];
  categories?: GalleryCategoryItem[];
  trending?: GalleryTrendingItem[];
}

// Skill Builder section configuration
export interface SkillBuilder {
  id?: string;
  badge?: string;
  title?: string;
  title_highlight?: string;
  description?: string;
  input_label?: string;
  input_placeholder?: string;
  input_hint?: string;
  output_label?: string;
  output_empty_title?: string;
  output_empty_hint?: string;
  button_generate?: string;
  button_generating?: string;
  button_reset?: string;
  button_download?: string;
}

// landing props for landing page component
export interface Landing {
  section_visibility?: SectionVisibility;
  header?: Header;
  hero?: Hero;
  skill_builder?: SkillBuilder;
  core_modules?: {
    id?: string;
    title?: string;
    description?: string;
  };
  logos?: Logos;
  introduce?: Features;
  benefits?: Features;
  usage?: Features;
  features?: Features;
  stats?: Stats;
  showcases?: Showcases;
  subscribe?: Subscribe;
  faq?: FAQ;
  cta?: CTA;
  testimonials?: Testimonials;
  gallery?: Gallery;
  footer?: Footer;
  sections?: Section[];
}

export interface DynamicPage {
  title?: string;
  description?: string;
  sections?: Record<string, Section>;
  show_sections?: string[];
}
