(async () => {
  try {
    const listRes = await fetch('http://localhost:5000/api/doctor/list');
    const list = await listRes.json();
    console.log('DOCTOR_LIST:', JSON.stringify(list, null, 2));
    if (list && list.success && list.doctors && list.doctors.length > 0) {
      const id = list.doctors[0]._id;
      console.log('\nFIRST_DOCTOR_ID:', id);
      const availRes = await fetch('http://localhost:5000/api/doctor/availability', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ docId: id })
      });
      const avail = await availRes.json();
      console.log('\nAVAILABILITY:', JSON.stringify(avail, null, 2));
    } else {
      console.log('No doctors found')
    }
  } catch (e) {
    console.error('ERROR', e.message || e)
  }
})()
