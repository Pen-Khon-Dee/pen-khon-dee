import { useState } from 'react';
import { getAdminCustomer } from '../api';

// ค้นหาลูกค้าด้วยเบอร์โทร ใช้ร่วมกันทั้งหน้า Customers และหน้า Reservations
export default function useCustomerSearch({ token, run, setError }) {
  const [phone, setPhone] = useState('');
  const [customer, setCustomer] = useState(null);
  const [notFound, setNotFound] = useState(false);

  const reset = () => {
    setCustomer(null);
    setNotFound(false);
  };

  const search = async () => {
    reset();
    if (!phone.trim()) {
      setError('Enter a phone number.');
      return;
    }
    await run(async () => {
      try {
        setCustomer(await getAdminCustomer(phone.trim(), token));
      } catch (err) {
        if (err.message.includes('No customer with this phone number')) setNotFound(true);
        else throw err;
      }
    });
  };

  const changePhone = (value) => {
    setPhone(value);
    reset();
  };

  return { phone, changePhone, customer, setCustomer, notFound, setNotFound, search, reset, setPhone };
}
