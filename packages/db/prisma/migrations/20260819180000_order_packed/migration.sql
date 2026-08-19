-- PACKED: wholesaler ka apna qadam — "maal bandh diya, courier ka intezar hai".
-- Is ke baghair ACCEPTED aur DISPATCHED ke darmiyan poora din khamosh guzar jata tha.
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'PACKED' AFTER 'ACCEPTED';
