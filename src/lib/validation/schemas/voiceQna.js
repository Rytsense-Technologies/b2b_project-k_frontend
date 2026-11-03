import { z } from 'zod';
import { conversationTitleField, voiceQuestionField } from '../fields';

export const voiceChatSchema = z.object({
  text: voiceQuestionField(),
});

export const conversationRenameSchema = z.object({
  title: conversationTitleField(),
});
