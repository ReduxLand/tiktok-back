export enum EPixelEvent {
  View = 'VIEW',
  Button = 'BUTTON',
  Consult = 'CONSULT',
  Register = 'ON_WEB_REGISTER', // Complete user registration.
  ShowDetails = 'ON_WEB_DETAIL', // Browse product details page.
  AddToCart = 'ON_WEB_CART',
  Order = 'ON_WEB_ORDER',
  CompletePayment = 'SHOPPING',
  FormDetail = 'FORM_DETAIL', // Browse details page (form submission).
  FormButton = 'FORM_BUTTON', // Click button (form submission).
  Form = 'FORM', // Form submission.
  PhoneDetail = 'PHONE_DETAIL', // Browse details page (phone consultation).
  PhoneButton = 'PHONE_BUTTON', // Click button (phone consultation).
  Phone = 'PHONE', // Phone consultation.
  DownloadDetail = 'DOWNLOAD_DETAIL', // Browse details page (app promotion).
  DownloadButton = 'DOWNLOAD_BUTTON', // Click button (app promotion).
  Download = 'DOWNLOAD_START', // Click to download (app promotion).
}
