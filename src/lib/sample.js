export const SAMPLE_AR = `---
title: مَتْنُ الكَافِيَةِ
subtitle: في علم الصرف والنحو
---

# الكلمة والكلام

الكلمة: لفظ وضع لمعنى مفرد، وهي: اسم، وفعل، وحرف.

الكلام: ما تضمّن كلمتين بالإسناد، ولا يتأتّى ذلك إلاّ في اسمين، أو فعل واسم.

## الفاعل

فنه الفاعل: وهو ما أسند إليه الفعل أو شبهه، وقدّم عليه على جهة قيامه به، مثل: (قام زيد)، و(زيد قائم أبوه).

## التنازع

إذا تنازع الفعلان ظاهرا بعدهما، فقد يكون في الفاعليّة مثل: (ضربني وأكرمني زيد)، وفي المفعوليّة مثل: (ضربت وأكرمت زيدا).

# الممنوع من الصرف

غير المنصرف: ما فيه علّتان من تسع، أو واحدة منها تقوم مقامهما، وهي:

> عدل ووصف وتأنيث ومعرفة ... وعجمة ثمّ جمع ثمّ تركيب
> والنّون زائدة من قبلها ألف ... ووزن فعل وهذا القول تقريب

مثل: عمر، وأحمر، وطلحة، وزينب، وإبراهيم، ومساجد.
`;

export const SAMPLE_EN = `---
title: A Short Guide to Style
subtitle: Notes on clear writing
---

# Words and Sentences

Word: a unit of language with its own meaning, standing alone or joined with others.

Sentence: a group of words that expresses a complete thought.

## The Subject

The subject is the noun or pronoun that performs the action of the verb, for example: (the boy ran), and (the house whose roof collapsed).

## Ambiguity

When two verbs share one subject, the meaning may point to either the doer or the receiver of the action, depending on context.

# Irregular Forms

Some words don't follow the regular pattern — they change shape in ways that must simply be learned, and this includes:

> Nouns that shift their vowel in the plural ... and verbs that break the usual rule
> Forms borrowed whole from older speech ... kept as the elders spoke them

For example: child/children, foot/feet, mouse/mice.
`;

// Backwards-compatible default export (Arabic), kept for any code that
// still imports SAMPLE directly.
export const SAMPLE = SAMPLE_AR;
