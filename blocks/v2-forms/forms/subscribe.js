import { getTextLabel, getLocale } from '../../../scripts/common.js';

const formContent = `
  <div class="v2-forms__floating-label-group">
    <input type="email" id="subscribe-email" name="email" autocomplete="off" placeholder=" " required />
    <label for="subscribe-email" class="v2-forms__floating-label">${getTextLabel('v2-forms:subscribe_email_label')}</label>
    <input type="hidden" id="form-locale" name="form-locale" value="${getLocale()}" />
  </div>
  <button class="button button--primary" type="submit">${getTextLabel('v2-forms:button_submit')}</button>
`;

export default formContent;
