-- The Vantillu Co. launch safety defaults.
-- The old seed enabled all 500xxx PINs (Hyderabad) before the owner confirmed
-- the actual launch territory. Remove only that untouched seed row so checkout
-- stays closed until the owner explicitly configures serviceable PINs.
delete from serviceable_postcodes
 where pattern = '500'
   and label = 'Hyderabad (default - review in admin)';

-- This launch is owner-operated. Remove any legacy staff grants and enforce
-- owner-only roles at the database level as well as in the application gate.
delete from admin_roles where role <> 'owner';
alter table admin_roles drop constraint if exists admin_roles_role_check;
alter table admin_roles add constraint admin_roles_role_check check (role = 'owner');
